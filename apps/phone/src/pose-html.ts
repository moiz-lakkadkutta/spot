/** MediaPipe Pose Landmarker (Tasks Vision JS) in a WebView. Posts {type:'frame', t, lm[33]{x,y,z,v}} to React Native. Lite model, LIVE_STREAM mode. */
export const POSE_HTML = `<!doctype html><html><body style="margin:0;background:#000">
<video id="v" playsinline autoplay muted style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1)"></video>
<script type="module">
  import { PoseLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
  const post = (m) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m))
  const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm')
  const lm = await PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', delegate: 'GPU' }, runningMode: 'VIDEO', numPoses: 1 })
  const v = document.getElementById('v')
  v.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
  await v.play()
  let n = 0, t0 = performance.now(), lastT = -1
  const loop = () => {
    if (v.currentTime !== lastT) {
      lastT = v.currentTime
      const r = lm.detectForVideo(v, performance.now())
      const p = r.landmarks && r.landmarks[0]
      if (p) post({ type: 'frame', t: Date.now(), lm: p.map((q, i) => ({ x: q.x, y: q.y, z: q.z, v: (r.worldLandmarks && r.worldLandmarks[0] && r.worldLandmarks[0][i] && q.visibility) || q.visibility || 0.9 })) })
      if (++n % 30 === 0) { post({ type: 'fps', fps: Math.round(30000 / (performance.now() - t0)) }); t0 = performance.now() }
    }
    requestAnimationFrame(loop)
  }
  loop()
</script></body></html>`
