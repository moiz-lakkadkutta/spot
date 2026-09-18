# 0004 — Pose path on the phone (provisional) and SPOT-001 routing

Status: provisional (2026-09-18) — becomes final when the owner fills docs/spikes/SPOT-001-pose.md §4 from a real phone.

## Decision (provisional)
Run MediaPipe Pose Landmarker **in a WebView** (`@mediapipe/tasks-vision` in `react-native-webview`, Expo Go, no native
build): `apps/phone`. The native path (VisionCamera + `react-native-mediapipe-posedetection`) is kept as a prepared
fallback in `apps/phone-native` (config resolves, `expo prebuild` passes; no APK built — no JDK/Android SDK/EAS session here).

Evidence so far is desktop-only (headless Chromium, fake camera): pipeline + GPU→CPU fallback verified end to end;
`visibility` present on every landmark. Nothing has been measured on a phone.

## Flip criteria (any one → native)
fps < 15 · inference p95 > 66 ms · page→app hand-off p95 > 50 ms · no `visibility` · CPU fallback or WebGL failure on
the device · battery drop > 5 points per 10 min · a hard offline requirement (WebView pulls ≈ 17 MB from CDNs on cold start).

## Routing deviation
ORCHESTRATOR.md §2 routes spikes to Fable. The Fable spike agent hit a rate limit mid-work; the owner chose to finish
the spike with Opus. The WebView-vs-native call above is therefore provisional pending a Fable review once the
limit resets, in addition to the device measurements.

## Follow-ups (repo-internal, not friction)
- `scripts/lint-words.mjs` does not glob `apps/phone-native/src/**` — checked by hand this once; add it.
- `@mediapipe/tasks-vision` pinned at 0.10.14 (the verified version); 1.0.1 is current.
