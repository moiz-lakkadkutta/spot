/**
 * Pure measurement math for the pose spike (SPOT-001). No React, no native imports — unit-tested in test/stats.test.ts.
 * Everything here works on landmark frames as posted by the pose source ({ t, lm[33]{x,y,z,v} }); never pixels.
 */
export interface Lm { x: number; y: number; z?: number; v: number }
export interface FrameMsg { t: number; lm: Lm[] }
/** MediaPipe Pose indices used for jitter (mirrors packages/heuristics/src/landmarks.ts LM). */
export const J = { nose: 0, lShoulder: 11, rShoulder: 12, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28 } as const

export const mean = (a: number[]): number => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
export const stddev = (a: number[]): number => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)) : 0 }
export function percentile(a: number[], p: number): number { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))]! }

export interface JointJitter { joint: 'shoulder' | 'hip' | 'knee'; sdX: number; sdY: number; sdPct: number; meanV: number }
export interface Jitter { n: number; seconds: number; bodyHeight: number; joints: JointJitter[]; meanPct: number; worstPct: number }
/**
 * Jitter of shoulders, hips and knees over a still-standing window: std dev of x and y (normalized image units,
 * left and right averaged) and the combined radial std dev as % of body height (nose→ankle-mid, mean over the window).
 */
export function jitter(frames: FrameMsg[]): Jitter {
  const n = frames.length
  if (n < 2) return { n, seconds: 0, bodyHeight: 0, joints: [], meanPct: 0, worstPct: 0 }
  const bodyHeight = mean(frames.map((f) => Math.abs((f.lm[J.lAnkle]!.y + f.lm[J.rAnkle]!.y) / 2 - f.lm[J.nose]!.y)))
  const one = (joint: JointJitter['joint'], l: number, r: number): JointJitter => {
    const sd = (i: number, k: 'x' | 'y') => stddev(frames.map((f) => f.lm[i]![k]))
    const sdX = (sd(l, 'x') + sd(r, 'x')) / 2, sdY = (sd(l, 'y') + sd(r, 'y')) / 2
    return { joint, sdX, sdY, sdPct: bodyHeight > 0 ? (Math.hypot(sdX, sdY) / bodyHeight) * 100 : 0, meanV: mean(frames.map((f) => (f.lm[l]!.v + f.lm[r]!.v) / 2)) }
  }
  const joints = [one('shoulder', J.lShoulder, J.rShoulder), one('hip', J.lHip, J.rHip), one('knee', J.lKnee, J.rKnee)]
  return { n, seconds: (frames[n - 1]!.t - frames[0]!.t) / 1000, bodyHeight, joints, meanPct: mean(joints.map((j) => j.sdPct)), worstPct: Math.max(...joints.map((j) => j.sdPct)) }
}

/** Gaps between consecutive frames longer than `maxMs` (recorder quality: a gap means the phone stalled). */
export function gaps(frames: Pick<FrameMsg, 't'>[], maxMs = 250): { count: number; longestMs: number } {
  let count = 0, longestMs = 0
  for (let i = 1; i < frames.length; i++) { const d = frames[i]!.t - frames[i - 1]!.t; if (d > maxMs) count++; longestMs = Math.max(longestMs, d) }
  return { count, longestMs }
}

/** Mean fps of a frame list from its timestamps. */
export function fpsOf(frames: Pick<FrameMsg, 't'>[]): number { const n = frames.length; if (n < 2) return 0; const s = (frames[n - 1]!.t - frames[0]!.t) / 1000; return s > 0 ? (n - 1) / s : 0 }

/** Rolling window of hand-off delays (pose source → React Native), in ms; reports mean and p95. */
export class DelayMeter {
  private buf: number[] = []
  constructor(private size = 150) {}
  push(delayMs: number) { this.buf.push(delayMs); if (this.buf.length > this.size) this.buf.shift() }
  read(): { mean: number; p95: number; n: number } { return { mean: mean(this.buf), p95: percentile(this.buf, 95), n: this.buf.length } }
}

/** Round every landmark to 4 decimals (0.0001 of the image ≈ 0.1 px at 1080p) — smaller JSON on the wire and in fixtures. */
export const round4 = (v: number): number => Math.round(v * 1e4) / 1e4

/** Fixture envelope written by Record mode; format: packages/heuristics/fixtures/README.md. */
export interface FixtureFile {
  schema: 'spot.fixture.v1'; id: string; recordedAt: string; exercise: 'sit_to_stand'; camera: 'side' | 'front'; path: 'webview' | 'native'
  phone: { model: string; os: string }; fps: number; manualReps: number; manualRepAt: number[]; notes: string; frames: FrameMsg[]
}
export function buildFixture(frames: FrameMsg[], manualRepAt: number[], meta: { id: string; path: 'webview' | 'native'; phone: FixtureFile['phone']; camera?: 'side' | 'front'; notes?: string }): FixtureFile {
  const t0 = frames[0]?.t ?? 0
  const rel = frames.map((f) => ({ t: f.t - t0, lm: f.lm.map((p) => ({ x: round4(p.x), y: round4(p.y), z: p.z === undefined ? undefined : round4(p.z), v: round4(Math.max(0, Math.min(1, p.v))) })) }))
  return { schema: 'spot.fixture.v1', id: meta.id, recordedAt: new Date(t0 || Date.now()).toISOString(), exercise: 'sit_to_stand', camera: meta.camera ?? 'side', path: meta.path, phone: meta.phone, fps: Math.round(fpsOf(rel) * 10) / 10, manualReps: manualRepAt.length, manualRepAt: manualRepAt.map((t) => t - t0), notes: meta.notes ?? '', frames: rel }
}
