# react-native-mediapipe-posedetection caps at 15 fps logs every frame and copies every file

Task attempted: Use `react-native-mediapipe-posedetection` 0.4.0 (the only MediaPipe pose frame-processor plugin that
targets RN 0.81 / VisionCamera 4.7 / New Architecture) as the native pose source for SPOT-001.
Steps:
  1. Read the README, the published `src/index.tsx` and the Android Kotlin sources in the npm tarball.
  2. Add the config plugin with `assetsPaths: ["./assets/models/"]` and run `expo prebuild`.
  3. Write the measurement screen against `usePoseDetection(callbacks, RunningMode.LIVE_STREAM, model, options)`.
Expected: Landmarks at camera rate (or a configurable rate), quiet in production, a plugin that copies only model files,
and a result shape that matches the README.
Actual:
  - Detection *and* JS events are hard-throttled to ~15 fps ("Automatic Frame Throttling", not configurable upward; `fpsMode`
    only lowers it). Fixtures recorded through it are 15 fps, not the 20–30 fps the WebView path gives.
  - `console.log('onResults event received:', handle)` runs on every frame in the library — Metro log spam at 15 lines/s.
  - The config plugin copies *every* file under `assetsPaths` (it copied our README.md into `android/app/src/main/assets/`).
  - The README shows `result.landmarks[0]`, but the actual payload is `{ results: [{ landmarks, worldLandmarks }], inferenceTime, inputImageWidth, inputImageHeight }`.
  - No camera timestamp in the event, so hand-off latency cannot be measured; no per-frame drop count.
  - The upstream (`react-native-mediapipe` 0.6.0) has not had a release since Dec 2024; this fork has 1 contributor and 28 stars.
Severity: Medium — it still looks buildable, but the 15 fps cap and logging would need a patch (patch-package) before use in the product.
Workaround: Measure with the cap acknowledged on screen; "frames skipped" derived from camera fps minus pose fps; result
shape taken from the `.d.ts`, not the README (apps/phone-native/src/App.tsx).
Suggestion: Make the throttle configurable (`fpsMode: 'none'` should mean none), gate the per-frame `console.log` behind
`__DEV__`/a flag, filter the plugin to `*.task`/`*.tflite`, include `frame.timestamp` in the event, and fix the README result shape.
Environment: macOS 15, Expo SDK 54 / RN 0.81.0, react-native-mediapipe-posedetection 0.4.0, react-native-vision-camera 4.7.3, react-native-worklets-core 1.6.x.
Links:
  - https://github.com/EndLess728/react-native-mediapipe-posedetection
  - https://github.com/cdiddy77/react-native-mediapipe
  - https://registry.npmjs.org/react-native-mediapipe-posedetection/-/react-native-mediapipe-posedetection-0.4.0.tgz
  - docs/spikes/SPOT-001-pose.md §2, §5.5
