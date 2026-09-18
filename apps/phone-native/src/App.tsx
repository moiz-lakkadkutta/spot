import React, { useEffect, useRef, useState } from 'react'
import { Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native'
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission } from 'react-native-vision-camera'
import { Delegate, RunningMode, usePoseDetection, type DetectionError, type PoseDetectionResultBundle } from 'react-native-mediapipe-posedetection'
import * as Battery from 'expo-battery'
import { useKeepAwake } from 'expo-keep-awake'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { DelayMeter, buildFixture, gaps, jitter, mean, percentile, type FrameMsg, type Jitter } from '../../phone/src/stats'

/**
 * SPOT-001 "native path": the same measurement harness as apps/phone (WebView path) but with MediaPipe Pose Landmarker
 * running natively through react-native-vision-camera + react-native-mediapipe-posedetection (a VisionCamera frame
 * processor plugin around MediaPipe Tasks). Needs a development build (`pnpm build` → EAS); it cannot run in Expo Go.
 * Same rules as the WebView app: nothing but landmarks leaves the camera pipeline; no pixels are stored or sent.
 * Runbook and library citations: docs/spikes/SPOT-001-pose.md §2.
 */
const C = { ground: '#121719', surface: '#1B2225', text: '#EDEEEA', dim: '#A9B3B0', good: '#7FB89A', adjust: '#E0B072', blue: '#8FB1C9' }
const CONSENT = 'Only the shape of your movement is recorded. No pictures.'
const MODEL = 'pose_landmarker_lite.task' // copied into the app by the library's config plugin from assets/models/
const BATTERY_CHECK_MIN = 10
const STILL_MS = 3000
type Mode = 'measure' | 'record'
type Stats = { fps: number; camFps: number; droppedPerS: number; inferMs: number; inferP95: number; noPose: number; hasVisibility: boolean }
type BatteryLog = { start?: number; state?: Battery.BatteryState; now?: number; at5?: number; at10?: number }

const androidConst = Platform.constants as { Brand?: string; Model?: string }
const PHONE = { model: Platform.OS === 'android' ? `${androidConst.Brand ?? ''} ${androidConst.Model ?? 'Android'}`.trim() : Platform.OS === 'ios' ? 'iPhone' : Platform.OS, os: `${Platform.OS} ${String(Platform.Version)}` }
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`
const pct = (v?: number) => (v === undefined || v < 0 ? '?' : `${Math.round(v * 100)} %`)
const batteryLine = (b: BatteryLog, elapsedMs: number): string => {
  if (b.start === undefined) return 'Battery: reading…'
  const plugged = b.state === Battery.BatteryState.CHARGING || b.state === Battery.BatteryState.FULL ? ' · unplug the phone for a fair reading' : ''
  if (b.at10 !== undefined) return `Battery: ${pct(b.start)} at start → ${pct(b.at10)} after ${BATTERY_CHECK_MIN} min (${Math.round((b.at10 - b.start) * 100)} points)${plugged}`
  const mid = b.at5 !== undefined ? ` · ${pct(b.at5)} at 5 min` : ''
  return `Battery: ${pct(b.start)} at start${mid} · now ${pct(b.now)} · ${BATTERY_CHECK_MIN}-minute check in ${mmss(Math.max(0, BATTERY_CHECK_MIN * 60000 - elapsedMs))}${plugged}`
}

function Btn({ label, onPress, tone = C.blue, big = false, disabled = false, hint }: { label: string; onPress: () => void; tone?: string; big?: boolean; disabled?: boolean; hint?: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={hint ?? label} style={{ backgroundColor: disabled ? C.surface : tone, padding: big ? 28 : 16, borderRadius: 12, minHeight: big ? 96 : 56, justifyContent: 'center', opacity: disabled ? 0.6 : 1 }}>
      <Text style={{ color: disabled ? C.dim : C.ground, fontSize: big ? 40 : 20, textAlign: 'center', fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
}

export default function App() {
  const [mode, setMode] = useState<Mode | null>(null)
  if (mode) return <Live mode={mode} onExit={() => setMode(null)} />
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ground }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16, justifyContent: 'center', flexGrow: 1 }}>
        <Text style={{ color: C.text, fontSize: 28, fontWeight: '600' }}>Spot camera check (native)</Text>
        <Text style={{ color: C.dim, fontSize: 16, lineHeight: 24 }}>Spot uses the camera to see the shape of your movement. It never sends pictures.</Text>
        <Btn label="Check the camera" onPress={() => setMode('measure')} tone={C.good} hint="Measure frames per second, steadiness and battery use" />
        <Btn label="Record a session" onPress={() => setMode('record')} tone={C.adjust} hint="Record the shape of one sit-to-stand session as a file" />
        <Text style={{ color: C.dim, fontSize: 14 }}>{PHONE.model} · {PHONE.os}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Live({ mode, onExit }: { mode: Mode; onExit: () => void }) {
  useKeepAwake()
  const { hasPermission, requestPermission } = useCameraPermission()
  const device = useCameraDevice('front')
  const format = useCameraFormat(device, [{ videoResolution: { width: 640, height: 480 } }, { fps: 30 }])
  const [ready, setReady] = useState<{ at: number; inputW: number; inputH: number } | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [bat, setBat] = useState<BatteryLog>({})
  const [jit, setJit] = useState<Jitter | null>(null)
  const [stillLeft, setStillLeft] = useState<number | null>(null)
  const [rec, setRec] = useState<{ frames: number; reps: number; gaps: number; shared?: string; error?: string } | null>(null)
  const [notes, setNotes] = useState('')
  const [delayRead, setDelayRead] = useState({ mean: 0, p95: 0, n: 0 })
  const delay = useRef(new DelayMeter())
  const still = useRef<{ until: number; frames: FrameMsg[] } | null>(null)
  const recRef = useRef<{ frames: FrameMsg[]; repAt: number[]; on: boolean } | null>(null)
  const startedAt = useRef(Date.now())
  const win = useRef<{ frames: number; noPose: number; withVis: number; infer: number[]; t0: number }>({ frames: 0, noPose: 0, withVis: 0, infer: [], t0: Date.now() })
  const lastStats = useRef<Stats | null>(null)
  const camFps = format?.maxFps ?? 30

  useEffect(() => { if (!hasPermission) void requestPermission() }, [hasPermission, requestPermission])
  useEffect(() => {
    void Battery.getPowerStateAsync().then((p) => setBat((b) => ({ ...b, start: p.batteryLevel, state: p.batteryState, now: p.batteryLevel })))
    const sub = Battery.addBatteryLevelListener(({ batteryLevel }) => setBat((b) => ({ ...b, now: batteryLevel })))
    const t5 = setTimeout(() => void Battery.getBatteryLevelAsync().then((v) => setBat((b) => ({ ...b, at5: v }))), 5 * 60000)
    const t10 = setTimeout(() => void Battery.getBatteryLevelAsync().then((v) => { setBat((b) => ({ ...b, at10: v })); console.log('[spot-battery]', JSON.stringify({ after10min: v, phone: PHONE, path: 'native' })) }), BATTERY_CHECK_MIN * 60000)
    const tick = setInterval(() => {
      setElapsed(Date.now() - startedAt.current)
      setDelayRead(delay.current.read())
      if (still.current && still.current.until <= Date.now()) { const j = jitter(still.current.frames); setJit(j); console.log('[spot-jitter]', JSON.stringify({ ...j, path: 'native' })); still.current = null; setStillLeft(null) } else if (still.current) setStillLeft(still.current.until - Date.now())
      if (recRef.current?.on) setRec({ frames: recRef.current.frames.length, reps: recRef.current.repAt.length, gaps: gaps(recRef.current.frames).count })
    }, 250)
    const stat = setInterval(() => {
      const w = win.current, s = (Date.now() - w.t0) / 1000
      if (s < 1) return
      const fps = +(w.frames / s).toFixed(1)
      const next: Stats = { fps, camFps, droppedPerS: +Math.max(0, camFps - fps).toFixed(1), inferMs: +mean(w.infer).toFixed(1), inferP95: +percentile(w.infer, 95).toFixed(1), noPose: w.noPose, hasVisibility: w.frames > 0 && w.withVis === w.frames }
      lastStats.current = next; setStats(next)
      win.current = { frames: 0, noPose: 0, withVis: 0, infer: [], t0: Date.now() }
    }, 1000)
    const log = setInterval(() => { if (lastStats.current) console.log('[spot-stats]', JSON.stringify({ ...lastStats.current, handoff: delay.current.read(), phone: PHONE, mode, path: 'native' })) }, 5000)
    return () => { sub.remove(); clearTimeout(t5); clearTimeout(t10); clearInterval(tick); clearInterval(stat); clearInterval(log) }
  }, [mode, camFps])

  const onResults = (r: PoseDetectionResultBundle) => {
    const now = Date.now()
    if (!ready) setReady({ at: now, inputW: r.inputImageWidth, inputH: r.inputImageHeight })
    const w = win.current
    w.frames++; w.infer.push(r.inferenceTime)
    const p = r.results[0]?.landmarks[0]
    if (!p || p.length !== 33) { w.noPose++; w.withVis++; return }
    let vis = true
    const lm = p.map((q) => { const hasV = typeof q.visibility === 'number'; if (!hasV) vis = false; return { x: q.x, y: q.y, z: q.z, v: hasV ? Math.max(0, Math.min(1, q.visibility as number)) : 1 } })
    if (vis) w.withVis++
    const frame: FrameMsg = { t: now, lm }
    // Hand-off delay: the library does not expose the camera timestamp, so this only measures the JS side (event → here) and reads ≈ 0.
    delay.current.push(0)
    if (still.current) still.current.frames.push(frame)
    if (recRef.current?.on) recRef.current.frames.push(frame)
  }
  const pose = usePoseDetection({ onResults, onError: (e: DetectionError) => { console.log('[spot-error]', e.message); setErr(`${e.message} (code ${e.code})`) } }, RunningMode.LIVE_STREAM, MODEL, { numPoses: 1, delegate: Delegate.GPU, mirrorMode: 'no-mirror' })

  const holdStill = () => { setJit(null); still.current = { until: Date.now() + STILL_MS, frames: [] }; setStillLeft(STILL_MS) }
  const startRec = () => { recRef.current = { frames: [], repAt: [], on: true }; setRec({ frames: 0, reps: 0, gaps: 0 }) }
  const plusOne = () => { if (recRef.current?.on) recRef.current.repAt.push(Date.now()) }
  const stopRec = async () => {
    const r = recRef.current; if (!r) return
    r.on = false
    const id = `sts-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36).slice(-4)}`
    const fx = buildFixture(r.frames, r.repAt, { id, path: 'native', phone: PHONE, camera: 'side', notes: [notes, `native GPU · input ${ready?.inputW ?? '?'}x${ready?.inputH ?? '?'} · cam ${camFps} fps`].filter(Boolean).join(' · ') })
    const g = gaps(r.frames)
    try {
      const file = new File(Paths.cache, `${id}.json`)
      file.write(JSON.stringify(fx))
      console.log('[spot-record]', JSON.stringify({ id, frames: fx.frames.length, fps: fx.fps, manualReps: fx.manualReps, gaps: g, uri: file.uri, path: 'native' }))
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: `Save ${id}.json` })
      setRec({ frames: fx.frames.length, reps: fx.manualReps, gaps: g.count, shared: `${id}.json · ${fx.frames.length} frames · ${fx.fps} fps · ${fx.manualReps} stand-ups counted · ${g.count} gaps` })
    } catch (e) { setRec({ frames: fx.frames.length, reps: fx.manualReps, gaps: g.count, error: `Could not save the file: ${String((e as Error).message ?? e)}` }) }
    recRef.current = null
  }

  const line = (s: string, tone = C.text) => <Text key={s} style={{ color: tone, fontSize: 17, lineHeight: 24 }}>{s}</Text>
  const status = err ? `The camera could not start. ${err}` : !device ? 'No front camera found on this phone.' : !ready ? 'Getting the camera ready…' : `Native MediaPipe · camera ${format?.videoWidth ?? '?'}×${format?.videoHeight ?? '?'} at ${camFps} fps · model input ${ready.inputW}×${ready.inputH} · first pose after ${((ready.at - startedAt.current) / 1000).toFixed(1)} s`
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ground }}>
      <View style={{ height: '42%' }}>
        {hasPermission && device ? (
          <Camera style={{ flex: 1 }} device={device} format={format} fps={camFps} isActive pixelFormat="yuv" frameProcessor={pose.frameProcessor} onLayout={pose.cameraViewLayoutChangeHandler} onError={(e) => setErr(e.message)} />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>{line('Spot needs the camera to see the shape of your movement.')}</View>
        )}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
        {line(mode === 'measure' ? 'Checking the camera (native)' : 'Recording a session (native)', C.dim)}
        {line(status, err ? C.adjust : C.dim)}
        {stats && line(`Frames per second: ${stats.fps} (camera gives ${stats.camFps}; the library caps at about 15)`, stats.fps >= 15 ? C.good : C.adjust)}
        {stats && line(`Time to find the pose: ${stats.inferMs} ms (slowest 1 in 20: ${stats.inferP95} ms) · frames skipped: about ${stats.droppedPerS} per second (camera rate minus pose rate)`)}
        {stats && line(`Frames without a person: ${stats.noPose}/s · visibility values: ${stats.hasVisibility ? 'yes' : 'no'} · hand-off delay: not measurable on this path (${delayRead.n} samples)`)}
        {line(batteryLine(bat, elapsed) + ` · running ${mmss(elapsed)}`)}
        {mode === 'measure' && (
          <View style={{ gap: 10 }}>
            <Btn label={stillLeft !== null ? `Hold still… ${Math.ceil(stillLeft / 1000)}` : 'Measure steadiness (stand still 3 s)'} onPress={holdStill} disabled={!ready || stillLeft !== null} tone={C.good} hint="Stand still for three seconds to measure how much the landmarks wobble" />
            {jit && jit.joints.length > 0 && line(`Wobble while still, as % of body height: ${jit.joints.map((j) => `${j.joint} ${j.sdPct.toFixed(2)} %`).join(' · ')} (mean ${jit.meanPct.toFixed(2)} %, ${jit.n} frames in ${jit.seconds.toFixed(1)} s)`, jit.worstPct < 1 ? C.good : C.adjust)}
            {jit && jit.joints.length > 0 && line(`Same, in image units: ${jit.joints.map((j) => `${j.joint} ±${j.sdX.toFixed(4)} x / ±${j.sdY.toFixed(4)} y`).join(' · ')} · visibility ${jit.joints.map((j) => j.meanV.toFixed(2)).join('/')}`, C.dim)}
            {jit && jit.joints.length === 0 && line('No frames arrived while holding still. Is the whole body in view?', C.adjust)}
          </View>
        )}
        {mode === 'record' && (
          <View style={{ gap: 10 }}>
            {line(CONSENT, C.dim)}
            {!rec && <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (room, light, where the phone stood)" placeholderTextColor={C.dim} style={{ color: C.text, fontSize: 17, backgroundColor: C.surface, padding: 12, borderRadius: 10 }} accessibilityLabel="Notes about this recording" />}
            {!rec && <Btn label="Start recording" onPress={startRec} disabled={!ready} tone={C.adjust} hint="Start recording the shape of your movement" />}
            {rec && !rec.shared && !rec.error && line(`Recording · ${rec.frames} frames · ${rec.reps} stand-ups counted · ${rec.gaps} gaps`, rec.gaps ? C.adjust : C.good)}
            {rec && !rec.shared && !rec.error && <Btn label={`+1 (${rec.reps})`} onPress={plusOne} big tone={C.good} hint="Count one stand-up" />}
            {rec && !rec.shared && !rec.error && <Btn label="Stop and share the file" onPress={() => void stopRec()} hint="Stop recording and open the share sheet to save the file" />}
            {rec?.shared && line(`Saved: ${rec.shared}`, C.good)}
            {rec?.error && line(rec.error, C.adjust)}
            {(rec?.shared || rec?.error) && <Btn label="Record another" onPress={() => setRec(null)} tone={C.adjust} hint="Start a new recording" />}
          </View>
        )}
        {line(`${PHONE.model} · ${PHONE.os} · native path`, C.dim)}
        <Btn label="Back" onPress={onExit} tone={C.surface} hint="Stop the camera and go back" />
      </ScrollView>
    </SafeAreaView>
  )
}
