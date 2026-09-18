/**
 * MediaPipe Pose Landmarker (Tasks Vision JS) running inside react-native-webview. The page owns the camera and the
 * model; it posts landmarks and counters to React Native — never pixels.
 *
 * Messages posted (JSON, via window.ReactNativeWebView.postMessage):
 *   { type: 'ready', delegate: 'GPU'|'CPU', fallback: string|null, loadMs, cam: { w, h, fps }, secure, rvfc, ua }
 *   { type: 'frame', t: Date.now(), lm: [33 × { x, y, z, v }] }        every frame a pose is found (native rate)
 *   { type: 'stats', fps, camFps, dropped, droppedPerS, inferMs, inferP95, noPose, hasVisibility, delegate }   once per second
 *   { type: 'error', message }
 *
 * Docs: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js (createFromOptions, detectForVideo, delegate)
 *       https://ai.google.dev/edge/api/mediapipe/js/tasks-vision.normalizedlandmark (x, y, z, visibility)
 *       https://unpkg.com/@mediapipe/tasks-vision@0.10.14/vision.d.ts (`canvas` option: "has to be set for GPU processing" —
 *       tasks-vision does NOT fall back to CPU by itself; the GL context is created lazily, so the first detectForVideo can
 *       throw even when createFromOptions succeeded. We warm up once and rebuild with delegate 'CPU' if either step throws.)
 *       https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback (dropped-frame counting)
 * Loaded with source.baseUrl 'https://localhost' so the page is a secure context (getUserMedia needs one); the page reports
 * window.isSecureContext in `ready`. The WASM bundle and the .task model are fetched from CDNs on every cold start
 * (≈ 11 MB wasm + 5.5 MB lite model) — see docs/spikes/SPOT-001-pose.md.
 */
export const MEDIAPIPE_VERSION = '0.10.14'
export const POSE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
export const POSE_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#000;overflow:hidden">
<video id="v" playsinline webkit-playsinline autoplay muted style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1)"></video>
<div id="msg" style="position:absolute;left:12px;top:12px;right:12px;color:#EDEEEA;font:16px sans-serif"></div>
<script type="module">
  const post = (m) => { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); else if (window.__spotSink) window.__spotSink(m) }
  const say = (s) => { document.getElementById('msg').textContent = s }
  const r4 = (x) => Math.round(x * 1e4) / 1e4
  window.addEventListener('error', (e) => post({ type: 'error', message: String(e.message) }))
  window.addEventListener('unhandledrejection', (e) => post({ type: 'error', message: String((e.reason && e.reason.message) || e.reason) }))
  const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}'
  let stage = 'load', fallback = null
  try {
    const t0 = performance.now()
    say('Getting ready…')
    const { PoseLandmarker, FilesetResolver } = await import(CDN)
    const vision = await FilesetResolver.forVisionTasks(CDN + '/wasm')
    // Explicit canvas: tasks-vision binds its WebGL context to it; without one, GPU set-up fails on some WebViews (google-ai-edge/mediapipe#4499).
    const canvas = document.createElement('canvas')
    const opts = (delegate) => ({ baseOptions: { modelAssetPath: '${POSE_MODEL_URL}', delegate }, runningMode: 'VIDEO', numPoses: 1, canvas })
    let delegate = 'GPU', lm = null
    const build = async (d) => { if (lm) { try { lm.close() } catch (_) {} } delegate = d; lm = await PoseLandmarker.createFromOptions(vision, opts(d)) }
    stage = 'create GPU'
    try { await build('GPU') } catch (e) { fallback = 'create: ' + String((e && e.message) || e); stage = 'create CPU'; await build('CPU') }
    const loadMs = Math.round(performance.now() - t0)
    const v = document.getElementById('v')
    stage = 'camera'
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } })
    v.srcObject = stream
    await v.play()
    // Warm-up: the GL context is created on first use, so a GPU delegate that "created" fine can still throw here.
    stage = 'first detect ' + delegate
    try { lm.detectForVideo(v, performance.now()) } catch (e) { if (delegate === 'GPU') { fallback = 'first detect: ' + String((e && e.message) || e); stage = 'create CPU'; await build('CPU'); stage = 'first detect CPU'; lm.detectForVideo(v, performance.now()) } else throw e }
    stage = 'running'
    const cam = stream.getVideoTracks()[0].getSettings()
    const rvfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype
    post({ type: 'ready', delegate, fallback, loadMs, cam: { w: cam.width || 0, h: cam.height || 0, fps: cam.frameRate || 0 }, secure: !!window.isSecureContext, rvfc, ua: navigator.userAgent })
    say('')
    let frames = 0, camFrames = 0, dropped = 0, droppedWindow = 0, noPose = 0, withVis = 0, infer = [], statT = performance.now(), lastPresented = null, lastVideoT = -1
    const stats = () => {
      const now = performance.now(), s = (now - statT) / 1000
      if (s < 1) return
      const sorted = [...infer].sort((a, b) => a - b)
      const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)] : 0
      post({ type: 'stats', fps: +(frames / s).toFixed(1), camFps: +(camFrames / s).toFixed(1), dropped, droppedPerS: +(droppedWindow / s).toFixed(1), inferMs: +(infer.reduce((a, b) => a + b, 0) / Math.max(1, infer.length)).toFixed(1), inferP95: +p95.toFixed(1), noPose, hasVisibility: frames > 0 && withVis === frames, delegate })
      frames = 0; camFrames = 0; droppedWindow = 0; noPose = 0; withVis = 0; infer = []; statT = now
    }
    const step = () => {
      const a = performance.now()
      const r = lm.detectForVideo(v, a)
      infer.push(performance.now() - a)
      frames++
      const p = r.landmarks && r.landmarks[0]
      if (p) {
        let vis = true
        const out = p.map((q) => { const hasV = typeof q.visibility === 'number'; if (!hasV) vis = false; return { x: r4(q.x), y: r4(q.y), z: r4(q.z || 0), v: r4(hasV ? Math.max(0, Math.min(1, q.visibility)) : 1) } })
        if (vis) withVis++
        post({ type: 'frame', t: Date.now(), lm: out })
      } else { noPose++; withVis++ }
      stats()
    }
    if (rvfc) {
      // One callback per camera frame actually presented; presentedFrames is cumulative, so any jump > 1 is a frame we never saw (inference was still busy).
      const cb = (_now, meta) => {
        if (lastPresented !== null) { const d = Math.max(0, meta.presentedFrames - lastPresented - 1); dropped += d; droppedWindow += d }
        lastPresented = meta.presentedFrames; camFrames++
        step()
        v.requestVideoFrameCallback(cb)
      }
      v.requestVideoFrameCallback(cb)
    } else {
      // Fallback: run on every animation frame where the video advanced; estimate skipped camera frames from the time gap.
      const interval = 1000 / (cam.frameRate || 30)
      const loop = () => {
        if (v.currentTime !== lastVideoT) {
          if (lastVideoT >= 0) { const gap = (v.currentTime - lastVideoT) * 1000; if (gap > 1.5 * interval) { const d = Math.round(gap / interval) - 1; dropped += d; droppedWindow += d } }
          lastVideoT = v.currentTime; camFrames++
          step()
        }
        requestAnimationFrame(loop)
      }
      loop()
    }
  } catch (e) {
    const raw = String((e && e.message) || e)
    // Plain-language hints for the two failures seen so far: no WebGL at all (tasks-vision needs it even for the CPU delegate) and a WASM abort.
    const hint = /activeTexture|WebGL|getContext/i.test(raw) ? 'This browser engine cannot draw with WebGL, which the pose model needs even without the graphics chip. ' : /Aborted\(\)/.test(raw) ? 'The pose model stopped inside its WebAssembly runtime. ' : ''
    const message = hint + raw + ' [stage: ' + stage + (fallback ? '; after GPU fallback — ' + fallback : '') + ']'
    post({ type: 'error', message })
    say('The camera could not start. ' + message)
  }
</script></body></html>`
