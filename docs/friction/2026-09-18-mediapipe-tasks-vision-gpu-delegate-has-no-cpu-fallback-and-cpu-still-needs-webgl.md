# mediapipe tasks-vision gpu delegate has no cpu fallback and cpu still needs webgl

Task attempted: Make the MediaPipe Pose Landmarker web runtime (`@mediapipe/tasks-vision` 0.10.14) degrade gracefully inside
an Android WebView: use the GPU delegate when it works and fall back to CPU when it does not (SPOT-001).
Steps:
  1. `PoseLandmarker.createFromOptions(vision, { baseOptions: { delegate: 'GPU' }, runningMode: 'VIDEO' })`.
  2. Run the page in headless Chromium with (a) normal WebGL, (b) `--disable-webgl2` (WebGL1 only), (c) `--disable-webgl`.
  3. Wrap `createFromOptions` *and* the first `detectForVideo` in try/catch and rebuild with `delegate: 'CPU'`.
Expected: `delegate: 'GPU'` falls back to CPU by itself when no GL context is available (as the Android/iOS Tasks APIs
effectively do by letting you pick a delegate and failing at creation), or at least fails at `createFromOptions` so the app
can react before the camera is open. The CPU delegate should not need WebGL.
Actual:
  - The GL context is created lazily: `createFromOptions` with `delegate: 'GPU'` can succeed and the *first*
    `detectForVideo` then throws or, worse, aborts the WASM instance (`Aborted()` / `gl_texture_buffer.cc: Check failed:
    prod_token` with WebGL1 only) — an abort poisons the module, so a fresh `createFromOptions` is needed.
  - The CPU delegate still needs WebGL for image upload: with WebGL disabled it dies with
    `Cannot read properties of undefined (reading 'activeTexture')`. "CPU" only moves inference.
  - The `canvas` option ("has to be set for GPU processing" in `vision.d.ts`) is not mentioned in the web guide.
  - Errors surface as generic JS exceptions or Emscripten `Aborted(). Build with -sASSERTIONS for more info.` with no code.
Severity: Medium — half a day to characterise; on a phone whose WebView lacks WebGL2 the whole page fails with no usable message.
Workaround: Explicit `canvas`, warm-up `detectForVideo` inside the fallback, rebuild with CPU on either failure, and a stage
tracker + plain-language hint in the error message (apps/phone/src/pose-html.ts; runs recorded in docs/spikes/SPOT-001-pose.md §5.1).
Suggestion: Document `delegate` and `canvas` on the web pose-landmarker page; validate the GL context eagerly in
`createFromOptions` and reject with a typed error (`GPU_UNAVAILABLE`) instead of aborting at first inference; state that
the CPU delegate requires WebGL for input processing.
Environment: macOS 15, headless Chromium 147 (Playwright) with SwiftShader; @mediapipe/tasks-vision 0.10.14 from jsDelivr; Android device run pending.
Links:
  - https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js
  - https://unpkg.com/@mediapipe/tasks-vision@0.10.14/vision.d.ts
  - https://github.com/google-ai-edge/mediapipe/issues/4499
  - https://github.com/google-ai-edge/mediapipe/issues/5348
  - docs/spikes/SPOT-001-pose.md §5.1, §5.4
