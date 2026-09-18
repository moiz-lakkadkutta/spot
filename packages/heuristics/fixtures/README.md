# Landmark fixtures

Real sit-to-stand (and later other exercise) sessions recorded on a phone as **landmarks only** — never pixels.
They are the ground truth for `packages/heuristics` threshold calibration (SPOT-002) and for the ≥ 95 % rep-agreement
acceptance test in `test/fixtures.test.ts`. Recording protocol: `docs/spikes/SPOT-001-pose.md` §3.

## Files

One JSON file per session: `fixtures/<id>.json`, e.g. `fixtures/sts-2026-09-20-a.json`. Anything that is not `*.json`
is ignored by the loader. While this folder holds no `*.json`, the fixture test is skipped (not failed).

## Format (`spot.fixture.v1`)

Validated by the `Fixture` Zod schema in `test/fixtures.ts`. `frames` is `Frame[]` from `@spot/contracts` verbatim.

```jsonc
{
  "schema": "spot.fixture.v1",
  "id": "sts-2026-09-20-a",          // file name without .json; <exercise>-<date>-<letter>
  "recordedAt": "2026-09-20T10:14:03.000Z",
  "exercise": "sit_to_stand",        // ExerciseId from contracts
  "camera": "side",                  // "side" | "front" — where the phone stood relative to the person
  "path": "webview",                 // "webview" | "native" — which pose pipeline produced the landmarks
  "phone": { "model": "Pixel 7", "os": "Android 15" },
  "fps": 27.4,                       // mean frames per second actually captured in this file (frames-1)/(duration s)
  "manualReps": 8,                   // stand-ups counted by the person tapping "+1" on the phone during the session
  "manualRepAt": [3100, 6900, …],    // optional: ms since the first frame of each "+1" tap (for aligning counts with the angle plot)
  "notes": "living room, daylight, phone on a chair at hip height, ~3 steps away",
  "frames": [
    { "t": 0,  "lm": [ { "x": 0.51, "y": 0.12, "z": -0.3, "v": 0.99 }, /* … 33 landmarks, MediaPipe Pose order */ ] },
    { "t": 33, "lm": [ /* … */ ] }
  ]
}
```

- `t` is milliseconds since the first frame of the session (first frame has `t: 0`), monotonic non-decreasing.
  Trackers only use differences of `t`, so the absolute epoch is not needed and is not stored.
- `lm[i]` follows the MediaPipe Pose Landmarker index order (`LM` in `src/landmarks.ts`: 11/12 shoulders,
  23/24 hips, 25/26 knees, 27/28 ankles, 29/30 heels, 31/32 foot index). `x`, `y` are normalized to the camera
  image `[0,1]` (origin top-left, y down); `z` is MediaPipe's depth estimate (optional, unitless); `v` is the
  landmark visibility in `[0,1]` (MediaPipe `visibility`).
- Frames are stored at the phone's native inference rate (typically 20–30 fps), **not** the 15 fps that is
  sent to the TV. Tests may downsample.
- A fixture is one continuous session: sit down → N stand-ups → stop. 8 reps ≈ 30–45 s ≈ 1 000 frames ≈ 1.5 MB.

## Quality bar for a usable fixture

- Side view, whole body in frame for the entire session (`checkFraming` true for ≥ 95 % of frames).
- `manualReps` counted on the phone during the session (the big "+1" button), not from memory afterwards.
- No frames were dropped for more than 250 ms in a row (the recorder shows "gaps" — re-record if it is not 0).

## Tools

- Plot the hip angle of a fixture: `pnpm --filter @spot/heuristics plot fixtures/<id>.json [--svg out.svg] [--width N]`
  (or `plot --synth` for the synthetic series).
- Make a synthetic fixture file to exercise the loader/plot before real ones exist (writes outside `fixtures/` on purpose):
  `pnpm --filter @spot/heuristics synth-fixture /tmp/synthetic.json --noise 0.003 --drop-every 7 --fps 30`
- Run the agreement test: `pnpm --filter @spot/heuristics test` (skipped while this folder has no `*.json`).

## How a file gets here

Record mode in `apps/phone` (WebView path) or `apps/phone-native` writes `<id>.json` to the phone's cache and opens the
share sheet; send it to yourself (Drive, mail, USB), drop it in this folder, run `plot` to eyeball it, then `test`.
