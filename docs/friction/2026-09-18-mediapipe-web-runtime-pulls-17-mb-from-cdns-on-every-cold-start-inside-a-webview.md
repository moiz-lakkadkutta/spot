# mediapipe web runtime pulls 17 MB from CDNs on every cold start inside a webview

Task attempted: Start the pose page inside `react-native-webview` in Expo Go without depending on the network at demo time (SPOT-001).
Steps:
  1. Page imports `@mediapipe/tasks-vision` from jsDelivr, `FilesetResolver.forVisionTasks(<cdn>/wasm)` and the
     `pose_landmarker_lite.task` from storage.googleapis.com.
  2. Look for a way to ship the WASM (≈ 11.2 MiB) and the model (5.5 MiB) inside the Expo app and load them from the page.
Expected: Bundle the assets with the app (Expo asset) and point `FilesetResolver` / `modelAssetPath` at a local URI.
Actual: `fetch` inside the WebView cannot read `file://` or `content://` (`allowFileAccess` is off by default and
`fetch` on file URLs is blocked regardless); `react-native-webview` has no `WebViewAssetLoader`-style hook; the only robust
route is a local HTTP server or a real https origin — extra native or JS infrastructure for a "no-build" path. Inline HTML
with `baseUrl` cannot reference bundled files at all. Every cold start therefore downloads ≈ 17 MB (and Expo Go clears the
WebView cache when the app is evicted). No offline story is documented for MediaPipe web tasks inside a WebView.
Severity: Medium — the demo needs Wi-Fi; first-start wait of 10–30 s on a phone; a day if we ever have to solve it.
Workaround: Accept the CDN cold start for the spike; report `loadMs` on screen so the cost is visible; flip criterion
recorded in docs/spikes/SPOT-001-pose.md §5 (offline requirement → native build).
Suggestion: react-native-webview: an `assetLoader` option mapping a virtual https path to app assets (Android has
`WebViewAssetLoader`, iOS `WKURLSchemeHandler`). MediaPipe: document `modelAssetBuffer` + `forVisionTasks` with a
`blob:`/`data:` URL flow, and publish the WASM in a form that can be inlined.
Environment: macOS 15, Expo SDK 54, react-native-webview 13.17.0, @mediapipe/tasks-vision 0.10.14 (1.0.1 is current).
Links:
  - https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/cors-and-webview-api.md
  - https://github.com/googlesamples/android-PermissionRequest
  - https://registry.npmjs.org/@mediapipe/tasks-vision
  - https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
  - docs/spikes/SPOT-001-pose.md §5.6
