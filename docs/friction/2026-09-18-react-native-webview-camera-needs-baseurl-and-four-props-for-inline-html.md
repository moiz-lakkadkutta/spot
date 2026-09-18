# react-native-webview camera needs baseUrl and four props for inline html

Task attempted: Run MediaPipe Pose Landmarker (Tasks JS) inside `react-native-webview` in Expo Go (SDK 54), with the page
supplied as an inline string (`source={{ html }}`), and get `navigator.mediaDevices.getUserMedia` to open the phone camera (SPOT-001).
Steps:
  1. `<WebView source={{ html: POSE_HTML }} />` with a page that calls `getUserMedia({ video: true })`.
  2. Read the Reference.md and the Android/iOS sources to find out why the camera would not be a given.
  3. Add, one by one: `originWhitelist={['*']}`, `allowsInlineMediaPlayback`, `mediaPlaybackRequiresUserAction={false}`,
     `mediaCapturePermissionGrantType="grant"`, `source.baseUrl: 'https://localhost'`, and request the CAMERA permission
     through expo-camera before mounting the WebView.
Expected: A WebView with camera access should need one prop ("allow camera") and the app's CAMERA permission; a secure
context for inline HTML should be the default or clearly documented.
Actual: Five separate switches, spread over three docs/sources, are needed and none of them is mentioned together:
  - inline HTML without an http(s) `baseUrl` has origin `null` on Android (`loadDataWithBaseURL`), so `isSecureContext` is
    false and `getUserMedia` is undefined; `baseUrl: 'https://localhost'` is the workaround (undocumented as such);
  - `mediaPlaybackRequiresUserAction` defaults to `true` and silently blocks `video.play()` on the camera stream;
  - `allowsInlineMediaPlayback` defaults to `false` (iOS) and sends the camera video full-screen;
  - `mediaCapturePermissionGrantType` is iOS-only, and the "same host" variants cannot work for inline HTML (host is empty);
  - the library declares no `CAMERA` permission; `onPermissionRequest` only auto-grants if the app already holds it, so the
    permission must be requested through another module (expo-camera) *before* the WebView mounts, otherwise a second
    prompt appears or the request hangs (issue #2004 reports `getUserMedia` hanging with `source={{ html }}`).
Severity: Medium — about 2 hours of reading source to assemble the combination; blocks anyone putting a camera page in a WebView.
Workaround: The combination above, plus an in-page `isSecureContext` readout so the device confirms it (apps/phone/src/App.tsx, pose-html.ts).
Suggestion: A "camera/microphone in a WebView" recipe in Reference.md listing all five switches, a warning in the
`source.html` docs that inline HTML is not a secure context without `baseUrl`, and an Android counterpart to
`mediaCapturePermissionGrantType` (or a note that it is iOS-only right next to the prop).
Environment: macOS 15 (Darwin 25.2), Expo SDK 54.0.27, react-native-webview 13.17.0, Expo Go on Android (device run pending).
Links:
  - https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md
  - https://github.com/react-native-webview/react-native-webview/blob/master/android/src/main/java/com/reactnativecommunity/webview/RNCWebChromeClient.java
  - https://github.com/react-native-webview/react-native-webview/issues/2004
  - https://github.com/react-native-webview/react-native-webview/issues/2854
  - https://developer.android.com/reference/android/webkit/WebView#loadDataWithBaseURL(java.lang.String,%20java.lang.String,%20java.lang.String,%20java.lang.String,%20java.lang.String)
  - docs/spikes/SPOT-001-pose.md §5.2–5.3
