# SPOT-001 — Pose spike: MediaPipe on the phone, landmarks to the TV, fixtures

Status: **desktop-verified, device measurements pending** (owner runs §1–§3 on a real Android phone and fills §4).
Question: can a phone in Expo run MediaPipe Pose at ≥ 15 fps, ship only landmarks over Socket.IO, and record three
sit-to-stand sessions as fixtures — and should the pose run in a WebView (Expo Go, no native build) or natively?

Every number below marked **not measured — needs device** is exactly that. Nothing in this doc was measured on a phone.

## 0. What exists (all in the working tree)

| Piece | Where | State |
|---|---|---|
| WebView path: camera → MediaPipe Tasks JS → landmarks → React Native | `apps/phone/src/pose-html.ts`, `apps/phone/src/App.tsx` | Runs in **Expo Go**; page verified end-to-end in headless Chromium (§5.1) |
| Measurement harness ("Check the camera") | `apps/phone/src/App.tsx` (`measure` mode), `apps/phone/src/stats.ts` (+ 5 unit tests) | fps, inference ms (mean/p95), dropped frames, hand-off delay, jitter, battery at 0/5/10 min, all on-screen and in `console.log` |
| Recorder ("Record a session") | `apps/phone/src/App.tsx` (`record` mode) | Frame[] at native rate → `spot.fixture.v1` JSON → share sheet |
| Native path (same harness + recorder) | `apps/phone-native/` | Config resolves (`expo prebuild` OK); **APK not built here** (§2) |
| Fixture format + loader + agreement test | `packages/heuristics/fixtures/README.md`, `test/fixtures.ts`, `test/fixtures.test.ts` | Real-fixture test skipped until `fixtures/*.json` exist |
| Hip-angle plot + synthetic fixture writer | `packages/heuristics/scripts/plot.ts`, `scripts/synth-fixture.ts` | Verified on synthetic data |

## 1. Run the WebView path on a real Android phone (Expo Go — no build needed)

Why Expo Go is enough: the WebView path only uses modules that ship inside Expo Go for SDK 54 (`react-native-webview`,
`expo-camera`, `expo-battery`, `expo-file-system`, `expo-sharing`, `expo-keep-awake`), and Expo Go's manifest already
declares `CAMERA` (https://docs.expo.dev/versions/v54.0.0/sdk/webview/,
https://github.com/expo/expo/blob/main/apps/expo-go/android/expoview/src/main/AndroidManifest.xml).

1. Phone and laptop on the same Wi-Fi. Install **Expo Go** from the Play Store. Unplug the phone (battery reading).
2. `pnpm install && pnpm --filter @spot/phone start` → scan the QR with Expo Go.
   Metro logs are the second record: everything on screen is also printed as `[spot-ready]`, `[spot-stats]` (every 5 s),
   `[spot-jitter]`, `[spot-battery]`, `[spot-record]` JSON lines.
3. Tap **Check the camera**. Allow the camera when asked (this is `expo-camera`'s prompt; the WebView is only mounted
   after it is granted, so Android's `onPermissionRequest` auto-grants `getUserMedia` — see §5.2).
4. First start downloads ≈ 11 MB WASM + 5.5 MB model from CDNs (§5.4). Wait for the status line to change from
   "Getting the camera ready…" to "Using the graphics chip · loaded in N s · camera W×H at F fps".
   - "Using the main processor only (graphics chip did not start: …)" means the GPU delegate failed and the CPU fallback took over — write the reason down.
   - "The camera could not start. …" is the in-page error with a plain-language hint and the stage it died at.
5. Stand ~3 steps from the phone, side-on, whole body in view. Read off, after 30 s:
   - **Frames per second** (green when ≥ 15) and "camera gives N" — camera fps vs pose fps.
   - **Time to find the pose** — inference ms, mean and "slowest 1 in 20" (p95).
   - **frames skipped: N per second** — camera frames the page never processed (counted with
     `requestVideoFrameCallback.presentedFrames`, https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback;
     "(estimated)" in the footer means the phone's WebView lacks that API and the count is a time-gap estimate).
   - **Hand-off to the app** — ms from the page stamping `Date.now()` to React Native receiving `onMessage` (§5.7).
   - **visibility values: yes/no** — whether every landmark carries `visibility` (contracts require `v`).
   - Footer: "Secure context: yes/no · per-frame camera callback: yes/no · phone model · OS".
6. Tap **Measure steadiness (stand still 3 s)** and hold still. Read **Wobble while still** for shoulder / hip / knee as
   % of body height (green when the worst joint < 1 %) and in image units (std dev of x and y).
7. **10-minute battery protocol.** Leave the screen on "Check the camera" (keep-awake is on), phone unplugged, camera
   pointed at a person or an empty room, for 10 minutes. The Battery line shows % at start, at 5 min, and after 10 min
   ("N points"). It also logs `[spot-battery]`. Repeat once plugged/unplugged if the first reading says "unplug the phone".
8. Tap **Back**. Copy the numbers into §4.

Optional: `chrome://inspect` on the laptop shows the WebView's console (`webviewDebuggingEnabled` is on in dev builds —
https://developer.chrome.com/docs/devtools/remote-debugging/webviews).

## 2. Run the native path (development build required — cannot run in Expo Go)

Why a dev build: VisionCamera and the MediaPipe frame-processor plugin are native modules that are not in Expo Go, so the
app must be compiled with them (https://docs.expo.dev/develop/development-builds/introduction/). The app lives in its own
directory `apps/phone-native` so the WebView app keeps working in Expo Go untouched.

What was verified on the desktop (no Android SDK / Java / EAS login on this machine, so no APK was produced):

- `pnpm install` resolves `react-native-vision-camera@4.7.3`, `react-native-worklets-core@1.6.x`,
  `react-native-mediapipe-posedetection@0.4.0`, `expo-dev-client@6` next to Expo SDK 54 / RN 0.81.0 / React 19.1.0.
- `pnpm --filter @spot/phone-native typecheck` passes.
- `pnpm --filter @spot/phone-native model` downloads `pose_landmarker_lite.task` (5.5 MB, git-ignored).
- `CI=1 pnpm --filter @spot/phone-native prebuild` (= `expo prebuild --platform android --no-install`) succeeds: both config
  plugins run, `android/app/src/main/AndroidManifest.xml` has `CAMERA`, `gradle.properties` has `newArchEnabled=true`, and the
  model is copied to `android/app/src/main/assets/` (https://docs.expo.dev/workflow/prebuild/).
- `npx expo-doctor` 17/18 (the 18th is the same `react-native 0.81.0` vs `0.81.5` pin the rest of the repo uses).

Owner steps:

1. `pnpm --filter @spot/phone-native model` (once).
2. `npx eas-cli login`, then `pnpm --filter @spot/phone-native build` (= `eas build -p android --profile development`,
   profile in `apps/phone-native/eas.json`, https://docs.expo.dev/build/eas-json/). Install the APK from the EAS link.
   Alternative with Android Studio installed: `pnpm --filter @spot/phone-native exec expo run:android`.
3. `pnpm --filter @spot/phone-native start` (Metro with `--dev-client`), open the installed **Spot Camera (native)** app.
4. Same screens as §1 steps 3–8 (Check the camera / Measure steadiness / Record). Differences to know:
   - The library throttles detection **and** JS events to ~15 fps by design (README "Automatic Frame Throttling"), so
     "Frames per second" tops out around 15 and fixtures from this path are ~15 fps, not 20–30.
   - "frames skipped" is camera fps minus pose fps (the plugin does not expose per-frame drop counts).
   - "Hand-off delay" is not measurable (the event carries no camera timestamp) and shows as such.
   - Inference ms comes from the library's `inferenceTime` (Kotlin `SystemClock` around the MediaPipe call).
5. If the build fails or the app crashes on start, copy the first error into §4 — that is a valid result for this spike.

## 3. Recording protocol — three sit-to-stand fixtures

Consent line shown on the phone (and the only thing that leaves the camera pipeline):
**"Only the shape of your movement is recorded. No pictures."**

Set-up (same for all three):
- A sturdy chair without arms, in daylight or a well-lit room. Phone propped **at hip height**, **side view** (the person's
  left or right side faces the camera), **about 3 steps (≈ 2 m) away**, so head and feet stay in frame when standing.
- Use the WebView app in Expo Go (§1) unless the native build exists; note which in the file name suffix if both.

Per session (`a`, `b`, `c` — vary one thing: e.g. `a` daylight, `b` lamp light, `c` different chair or the other side):
1. Home → **Record a session** → type a note (room, light, where the phone stood) → **Start recording**.
2. Sit. Do **8** slow sit-to-stands. After each stand-up, tap the big **+1** (a helper can tap; count on the way up).
3. Sit, wait 2 s, tap **Stop and share the file**. The share sheet opens with `sts-YYYY-MM-DD-xxxx.json`; send it to
   Drive / mail / yourself. The screen shows "Saved: … N frames · F fps · 8 stand-ups counted · G gaps".
   - `gaps` must be **0** (a gap is > 250 ms between frames — the phone stalled). Otherwise re-record.
   - If the share sheet does not appear, the file is also at the `uri` in the `[spot-record]` Metro log line.
4. Copy the file to `packages/heuristics/fixtures/<id>.json`, then:
   `pnpm --filter @spot/heuristics plot fixtures/<id>.json` — the ASCII plot should show 8 clear arcs from < 100° to > 160°
   with `|` rep marks under each; then `pnpm --filter @spot/heuristics test` runs the agreement test (≥ 95 %).
5. Fixture quality bar and format: `packages/heuristics/fixtures/README.md`.

## 4. Results (owner fills in — every cell is "not measured — needs device" until then)

Phone: ______________ · Android ___ · Chrome/WebView version (from the footer `ua`): ______________ · date: ________

| Measurement | WebView path (Expo Go) | Native path (dev build) | Target |
|---|---|---|---|
| Delegate that started (GPU / CPU, fallback reason) | not measured — needs device | not measured — needs device | GPU |
| Cold-start load (s) | not measured — needs device | not measured — needs device | < 15 s |
| Camera resolution × fps | not measured — needs device | not measured — needs device | 640×480 @ 30 |
| Pose fps (30-s mean) | not measured — needs device | not measured — needs device | ≥ 15 |
| Inference ms mean / p95 | not measured — needs device | not measured — needs device | < 66 ms |
| Frames skipped per second | not measured — needs device | not measured — needs device | informational |
| Hand-off delay mean / p95 (ms) | not measured — needs device | n/a (see §2.4) | < 50 ms |
| Visibility values present | not measured — needs device | not measured — needs device | yes |
| Jitter while still: shoulder / hip / knee (% body height) | not measured — needs device | not measured — needs device | < 1 % |
| Jitter in image units (x / y std dev) | not measured — needs device | not measured — needs device | informational |
| Battery % at 0 / 5 / 10 min (unplugged) | not measured — needs device | not measured — needs device | ≤ 5 points / 10 min |
| Secure context / rVFC available | not measured — needs device | n/a | yes / yes |
| Build/run problems hit | | | |

Fixtures recorded: `fixtures/sts-____-a.json` (__ frames, __ fps, gaps __) · `-b` · `-c` · plot agrees with manual count: __/__/__

## 5. Provisional decision and evidence

**Provisional: WebView path** (MediaPipe Tasks JS inside `react-native-webview`, in Expo Go), with the native path kept
as a prepared fallback in `apps/phone-native`.

Why (evidence available today):
1. It is the only path that runs without a native build: Expo Go, one QR scan, no EAS credentials, no Android SDK. For a
   hackathon where the phone is a "dumb sensor" and every device-side change must be re-testable in minutes, this is decisive.
2. The whole pipeline is verified end-to-end on the desktop in headless Chromium against the exact page string the app ships
   (§5.1): model loads, GPU delegate starts with an explicit canvas, `requestVideoFrameCallback` drives inference, every
   landmark carries `visibility`, stats and errors arrive as `postMessage` JSON. Only the phone-specific numbers are missing.
3. The failure modes are known and handled: GPU delegate failure → automatic CPU rebuild (a forced GPU failure ran on
   through to a working CPU delegate with full stats, §5.1); a WebView with broken or missing WebGL is reported in plain
   language with the stage it died at — that case cannot be rescued by the CPU delegate (tasks-vision needs GL for image
   upload either way) and is one of the things that would flip the decision (below).
4. The native candidate is credible but unproven here: `react-native-mediapipe-posedetection` 0.4.0 is developed against
   exactly this stack (React 19.1.0 / RN 0.81.1 / VisionCamera ^4.7.3 / worklets-core ^1.6.2 in its devDependencies:
   https://github.com/EndLess728/react-native-mediapipe-posedetection), has an Expo config plugin, emits `visibility`
   (Kotlin `ConvertHelpers.kt` writes `visibility`/`presence`), and `expo prebuild` succeeds — but it is a 28-star fork of an
   80-star project whose last release is Dec 2024, it hard-caps output at ~15 fps, logs to the console on every frame, and it
   needs an EAS/Gradle build that could not be attempted on this machine.

Flip to native if any of these is measured on the device:
- WebView pose fps < 15 with the GPU delegate on a mid-range phone, or inference p95 > 66 ms, or hand-off p95 > 50 ms.
- `visibility` missing from the WebView landmarks (contracts require `v`; the desktop run had it).
- The WebView falls back to CPU (or fails on WebGL) on the owner's phone or on the Fire OS phone-side target.
- Battery drop > 5 points in 10 minutes on the WebView path while the native path measures materially less.
- Cold-start CDN download is unacceptable (no Wi-Fi at demo time): bundling WASM + model offline inside a WebView needs a
  local HTTP origin (§5.6), at which point a native build is comparable effort.

Flip *back* / stay if the native build fails on EAS, crashes on start, or `react-native-mediapipe-posedetection`'s 15 fps cap
and console spam cannot be patched quickly.

### 5.1 Desktop verification of the WebView page (done on 2026-09-18, this machine)

Method: the exact `POSE_HTML` string was extracted from `apps/phone/src/pose-html.ts`, served over `http://localhost`, and
opened in headless Chromium 147 (Playwright) with `--use-fake-device-for-media-stream` (a synthetic test pattern, so no
person → `noPose` frames, which is expected) and SwiftShader WebGL. Messages the page would `postMessage` to React Native
were captured through the page's `window.__spotSink` hook.

| Run | Chromium flags | Result |
|---|---|---|
| Normal | swiftshader GL | `ready { delegate: 'GPU', fallback: null, loadMs: 1210, cam 640×480 @ 20, secure: true, rvfc: true }`; stats ≈ 13.6 fps, inference 73 ms mean / 76–83 ms p95 (software GL on a laptop — **not** a phone number), `hasVisibility: true`, dropped-frame counter working |
| Forced GPU failure (`build('GPU')` replaced by `throw`) | swiftshader GL | `ready { delegate: 'CPU', fallback: 'create: forced GPU failure…' }`; stats 20 fps = camera fps, 0 dropped, inference 9.6 ms mean / 9.9 ms p95 (laptop CPU via WASM/XNNPACK — **not** a phone number), `hasVisibility: true`. The fallback path works end to end. |
| WebGL2 off (`--disable-webgl2`) | WebGL1 only | GPU first-detect → WASM `Aborted()` (`gl_texture_buffer.cc: Check failed: prod_token`) → automatic rebuild with CPU → CPU also aborts. Reported: "The pose model stopped inside its WebAssembly runtime … [stage: first detect CPU; after GPU fallback — first detect: Aborted()]" |
| WebGL off (`--disable-3d-apis --disable-webgl`) | none | GPU create → `kGpuService` missing → rebuild CPU → first detect `Cannot read properties of undefined (reading 'activeTexture')`. Reported with the hint "This browser engine cannot draw with WebGL, which the pose model needs even without the graphics chip." |

Finding: tasks-vision 0.10.14 uses WebGL for image upload **regardless of delegate**; the CPU delegate only moves inference.
On Android WebView (Chromium ≥ 58 has WebGL2, https://caniuse.com/webgl2) this is expected to be fine, but the phone must
confirm it. The fallback logic itself (create-failure and first-detect-failure → CPU rebuild) is exercised and reports the
stage and reason.

### 5.2 Camera permission inside `react-native-webview`

- Android: `RNCWebChromeClient.onPermissionRequest` grants `getUserMedia` synchronously when the app already holds
  `CAMERA`, otherwise it prompts; the library declares no permission itself, the app must (`app.json` → `android.permissions: ["CAMERA"]`).
  https://github.com/react-native-webview/react-native-webview/blob/master/android/src/main/java/com/reactnativecommunity/webview/RNCWebChromeClient.java,
  https://github.com/react-native-webview/react-native-webview/issues/2854,
  https://developer.android.com/reference/android/webkit/WebChromeClient#onPermissionRequest(android.webkit.PermissionRequest)
- So the app asks through `expo-camera`'s `useCameraPermissions` first and only mounts the WebView once granted
  (https://docs.expo.dev/versions/v54.0.0/sdk/camera/).
- iOS (not the target, noted for completeness): WKWebView `getUserMedia` needs iOS 14.5+, `allowsInlineMediaPlayback`,
  and `mediaCapturePermissionGrantType="grant"` because an inline-HTML page has no host to match
  (https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md#mediacapturepermissiongranttype,
  https://developer.apple.com/documentation/webkit/wkuidelegate/webview(_:requestmediacapturepermissionfor:initiatedbyframe:type:decisionhandler:)).
  A permission granted while the WebView is already mounted is not seen until it is recreated
  (https://github.com/react-native-webview/react-native-webview/issues/2138).

### 5.3 WebView props used, and why

`source={{ html, baseUrl: 'https://localhost' }}` (inline HTML without an http(s) base has origin `null` and is not a secure
context on Android — https://developer.android.com/reference/android/webkit/WebView#loadDataWithBaseURL(java.lang.String,%20java.lang.String,%20java.lang.String,%20java.lang.String,%20java.lang.String);
the page reports `isSecureContext` so the phone confirms it), `originWhitelist={['*']}` (required for static HTML),
`allowsInlineMediaPlayback`, `mediaPlaybackRequiresUserAction={false}` (default `true` blocks `video.play()`),
`mediaCapturePermissionGrantType="grant"`, `webviewDebuggingEnabled={__DEV__}`.
https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md.
Known issue to watch on device: `getUserMedia` hanging with `source={{ html }}` (https://github.com/react-native-webview/react-native-webview/issues/2004) —
the `baseUrl` is the documented mitigation; if it still hangs, serve the page from a local HTTP server.

### 5.4 MediaPipe Tasks JS: versions, sizes, GPU delegate

- Repo pins `@mediapipe/tasks-vision@0.10.14` (2024-05); npm latest is 1.0.1 (2026-07). Unpacked 36.8 MB; the WASM
  the page fetches is ≈ 11.2 MiB; models: lite 5.5 MiB, full 9.0 MiB, heavy 29.2 MiB.
  https://registry.npmjs.org/@mediapipe/tasks-vision, https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
- `delegate: 'GPU'` only switches the acceleration proto; the GL context is created lazily and throws when unavailable —
  no automatic CPU fallback. The `canvas` option "has to be set for GPU processing"
  (https://unpkg.com/@mediapipe/tasks-vision@0.10.14/vision.d.ts). Related issues: WKWebView GL context
  (https://github.com/google-ai-edge/mediapipe/issues/4499), Android 9 WebView `kGpuService`
  (https://github.com/google-ai-edge/mediapipe/issues/5348), iOS Safari GPU output (https://github.com/google-ai-edge/mediapipe/issues/6142).
- API: `PoseLandmarker.createFromOptions`, `detectForVideo(video, timestampMs)`, `NormalizedLandmark {x, y, z, visibility}`
  (https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js,
  https://ai.google.dev/edge/api/mediapipe/js/tasks-vision.normalizedlandmark). Landmark index order used by
  `packages/heuristics/src/landmarks.ts`: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker.

### 5.5 Native options for Expo SDK 54 / RN 0.81 (researched, one attempted)

| Option | State | Visibility (`v`)? | Build needs | Verdict |
|---|---|---|---|---|
| `react-native-mediapipe-posedetection` 0.4.0 (VisionCamera frame-processor plugin, MediaPipe Tasks Android 0.10.26) — https://github.com/EndLess728/react-native-mediapipe-posedetection | Released 2026-01-20; devDeps RN 0.81.1 / VisionCamera ^4.7.3 / worklets-core ^1.6.2; New Architecture only | Yes (`visibility`, `presence` in `ConvertHelpers.kt`) | Dev build; Expo config plugin copies the `.task`; `react-native-worklets-core/plugin` in Babel | **Attempted** (`apps/phone-native`): prebuild OK, APK needs EAS. Caveats: hard ~15 fps cap, `console.log` per frame |
| `react-native-mediapipe` 0.6.0 (cdiddy77; the upstream of the above) — https://github.com/cdiddy77/react-native-mediapipe | Last release 2024-12-12, built on RN 0.73 / VisionCamera 4.5; 48 open issues | Yes | Dev build; no Expo plugin (manual model copy) | Superseded by the fork for RN 0.81 |
| `@thinksys/react-native-mediapipe` 0.0.21 — https://github.com/ThinkSys/mediapipe-reactnative | Released 2026-04; own camera view (`RNMediapipe`, `onLandmark`); custom "MIT with restrictions" licence | Not documented | Dev build; manual manifest edits | Not chosen: licence and undocumented landmark shape |
| VisionCamera 5.x (Nitro modules) — https://github.com/mrousavy/react-native-vision-camera | 5.2.3 (2026-08); frame processors moved to Nitro | n/a (no pose plugin for v5 found) | Dev build | No pose plugin yet |
| Own Expo Module (Kotlin) around MediaPipe Tasks Android + CameraX — https://docs.expo.dev/modules/overview/, https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/android | Nothing to maintain but ours | Yes (Tasks API) | Dev build; Android only in the time available | Fallback if the plugin above proves broken; > 2 h |
| `react-native-fast-tflite` + MoveNet | Maintained | 17 keypoints with per-point score — **not** the 33-landmark `Frame` contract | Dev build | Rejected (contract) |

VisionCamera 4.7.2 notes "Fix build for RN 0.81" (https://github.com/mrousavy/react-native-vision-camera/releases);
frame processors require the worklets Babel plugin (https://react-native-vision-camera.com/docs/guides/frame-processors);
`react-native-worklets` (Software Mansion) ≥ 0.9.1 requires RN 0.83+, so worklets-core 1.6 is the only choice on 0.81.

### 5.6 Offline / bundled assets (not done; needed only if CDN cold-start is unacceptable)

`fetch` inside the WebView cannot read `file://` or `content://` URIs and `allowFileAccess` defaults to false; the robust
route is a local HTTP origin (`WebViewAssetLoader`-style) serving the WASM and the model
(https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/cors-and-webview-api.md,
https://github.com/googlesamples/android-PermissionRequest). `FilesetResolver.forVisionTasks(url)` accepts any URL and
`baseOptions.modelAssetBuffer` accepts bytes. ≈ 17 MB payload. Unverified end-to-end.

### 5.7 `postMessage` throughput

Android path: `@JavascriptInterface` → main-thread post → `onMessage` (string only). Cost scales with message size
(https://github.com/react-native-webview/react-native-webview/issues/1120; latency report
https://github.com/react-native-webview/react-native-webview/issues/3991). Our frame message is ≈ 1.6 kB (33 × 4 numbers
rounded to 4 decimals) at camera rate; the harness measures the actual hand-off delay (§1.5). The TV link is throttled to
15 fps in `connect` mode regardless. If the measured p95 exceeds 50 ms, batch frames or move the 15 fps throttle into the page.

### 5.8 Other APIs relied on

- expo-battery `getPowerStateAsync`, `addBatteryLevelListener`: https://docs.expo.dev/versions/v54.0.0/sdk/battery/
- expo-file-system `File`, `Paths.cache` (SDK 54 API): https://docs.expo.dev/versions/v54.0.0/sdk/filesystem/
- expo-sharing `shareAsync`: https://docs.expo.dev/versions/v54.0.0/sdk/sharing/
- expo-keep-awake `useKeepAwake`: https://docs.expo.dev/versions/v54.0.0/sdk/keep-awake/
- app.json `android.permissions`, `newArchEnabled`, `plugins`: https://docs.expo.dev/versions/v54.0.0/config/app/
- Expo in a pnpm monorepo (Metro watches the workspace root, so `apps/phone-native` imports `../phone/src/stats.ts`): https://docs.expo.dev/guides/monorepos/

## 6. Not done, and why

- No number in §4 is measured: no Android device, SDK, Java or EAS session on the machine this was written on.
- Native APK not built (same reason). Everything up to `expo prebuild` is verified.
- Offline bundling of WASM/model (§5.6) not attempted — only needed if the decision flips on cold-start.
- `@mediapipe/tasks-vision` left at 0.10.14 (the version the page was verified with); 1.0.1 is one constant away
  (`MEDIAPIPE_VERSION` in `pose-html.ts`) if a device problem points at the runtime.
