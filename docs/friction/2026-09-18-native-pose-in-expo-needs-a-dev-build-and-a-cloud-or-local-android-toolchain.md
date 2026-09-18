# native pose in expo needs a dev build and a cloud or local android toolchain

Task attempted: Compare a native MediaPipe pose pipeline (react-native-vision-camera + a MediaPipe frame-processor plugin)
against the WebView pipeline on the same phone, within the SPOT-001 spike, from a laptop with no Android Studio.
Steps:
  1. Create `apps/phone-native` with `react-native-vision-camera@4.7.3`, `react-native-worklets-core@1.6`,
     `react-native-mediapipe-posedetection@0.4.0`, `expo-dev-client@6`.
  2. `pnpm install`, `tsc --noEmit`, `expo prebuild --platform android --no-install` — all pass.
  3. Try to produce an APK: no Java runtime, no Android SDK (`ANDROID_HOME` unset), `eas` not installed and no EAS login.
Expected: Some way to get a first native measurement without a full Android toolchain or an account-bound cloud build —
e.g. a prebuilt "Expo Go + common native modules" client, or `eas build` usable from CI credentials already in the repo.
Actual: Expo Go cannot load any non-bundled native module, so the native path requires a development build; that means
either Android Studio + JDK locally (several GB, ~1 h set-up) or an EAS build (account login, queue time, 10–20 min per
build, free-tier limits). The spike therefore ends at "prebuild OK, APK not built" on this machine, and the native
numbers wait for the owner. `expo prebuild` also silently added `android`/`ios` scripts to package.json.
Severity: High for a time-boxed spike — the native comparison could not be measured at all here; Low once a device + EAS session exist.
Workaround: Separate app dir so the WebView path keeps working in Expo Go; runbook with the exact EAS command and
`eas.json` development profile (docs/spikes/SPOT-001-pose.md §2); prebuild + expo-doctor as the evidence that the config is sound.
Suggestion: An Expo-maintained "development client with popular native modules" (VisionCamera, worklets) installable from
the Play Store for spikes, or an `eas build --local` that fetches a pinned JDK/SDK into a cache directory automatically.
Environment: macOS 15 (Darwin 25.2), Node 22.19, pnpm 9.15, Expo SDK 54.0.27 / RN 0.81.0, no JDK, no Android SDK, no EAS session.
Links:
  - https://docs.expo.dev/develop/development-builds/introduction/
  - https://docs.expo.dev/build/eas-json/
  - https://docs.expo.dev/workflow/prebuild/
  - https://react-native-vision-camera.com/docs/guides
  - docs/spikes/SPOT-001-pose.md §2, §5.5
