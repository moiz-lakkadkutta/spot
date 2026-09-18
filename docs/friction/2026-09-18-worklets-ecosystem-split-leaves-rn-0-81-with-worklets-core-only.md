# worklets ecosystem split leaves rn 0.81 with worklets-core only

Task attempted: Pick a VisionCamera + frame-processor stack that installs cleanly on Expo SDK 54 (React Native 0.81) for the SPOT-001 native path.
Steps:
  1. Check `react-native-vision-camera` versions: 4.7.x (worklets via `react-native-worklets-core`) vs 5.x (Nitro modules, released 2026-04).
  2. Check `react-native-worklets` (Software Mansion): 0.8.x supports RN 0.81–0.85, 0.9.1+ requires RN 0.83–0.87.
  3. Check which pose plugins exist for each: only VisionCamera-4-style plugins (`react-native-mediapipe*`) exist; none for v5/Nitro.
Expected: One worklets runtime and one VisionCamera line that the current Expo SDK, its Reanimated, and the plugin ecosystem all agree on.
Actual: Three incompatible worklet runtimes are in play (worklets-core 1.6 for VisionCamera 4 plugins, Software Mansion's
`react-native-worklets` for Reanimated 4 — which on RN 0.81 must stay at 0.8.x — and Nitro for VisionCamera 5). A project
that needs Reanimated 4 *and* a VisionCamera-4 pose plugin ends up with two worklet runtimes and two Babel plugins. The
pose plugin ecosystem has not moved to VisionCamera 5, so choosing the current VisionCamera means no pose plugin at all.
Severity: Medium — a day of version archaeology for anyone new; pins the native path to an ageing VisionCamera line.
Workaround: Pin VisionCamera 4.7.3 + worklets-core 1.6 + `react-native-worklets-core/plugin` in Babel; do not add Reanimated to `apps/phone-native`.
Suggestion: Expo SDK release notes could list the VisionCamera/worklets combination known to work with each SDK; VisionCamera
could keep a compatibility table of frame-processor plugins per major version.
Environment: macOS 15, Expo SDK 54 / RN 0.81.0, react-native-vision-camera 4.7.3 (5.2.3 current), react-native-worklets-core 1.6.x, react-native-worklets 0.12.2 current.
Links:
  - https://github.com/mrousavy/react-native-vision-camera/releases
  - https://react-native-vision-camera.com/docs/guides/frame-processors
  - https://registry.npmjs.org/react-native-worklets
  - https://registry.npmjs.org/react-native-vision-camera
  - docs/spikes/SPOT-001-pose.md §5.5
