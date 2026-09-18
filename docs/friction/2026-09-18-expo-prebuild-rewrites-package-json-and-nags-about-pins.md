# expo prebuild rewrites package.json and nags about pins

Task attempted: Verify the native-path config with `expo prebuild --platform android --no-install` and `expo-doctor` in a pnpm monorepo (SPOT-001).
Steps:
  1. `CI=1 pnpm exec expo prebuild --platform android --no-install` in `apps/phone-native`.
  2. `git diff apps/phone-native/package.json`.
  3. `npx expo-doctor`.
Expected: Prebuild generates `android/` and leaves the source tree alone; doctor accepts the workspace's intentional pins.
Actual:
  - Prebuild silently adds `"android": "expo run:android"` and `"ios": "expo run:ios"` scripts to package.json, and prints
    "Using react-native@0.81.0 instead of recommended react-native@0.81.5" plus "userInterfaceStyle: Install expo-system-ui"
    even though `userInterfaceStyle` is a plain app.json key used by every Expo app in this repo.
  - expo-doctor fails the run (exit 1) on `react-native 0.81.0 ≠ 0.81.5` and `@types/react 19.3.0 ≠ ~19.1.10`, which are
    the repo-wide pins; the fix (`expo.install.exclude`) has to be discovered from a URL in the output.
Severity: Low — minutes, but it dirties the working tree during a spike and turns a green check red for no reason.
Workaround: Keep the added scripts (harmless); ignore the doctor exit code and read the table; `android/` is git-ignored.
Suggestion: `--no-install` should imply "do not touch package.json"; doctor should treat patch-level pins as a warning
(exit 0) and print the `expo.install.exclude` snippet inline.
Environment: macOS 15, Node 22.19, pnpm 9.15 workspace, Expo SDK 54.0.27 (expo 54.0.37), expo-doctor latest.
Links:
  - https://docs.expo.dev/workflow/prebuild/
  - https://expo.fyi/dependency-validation
  - https://docs.expo.dev/guides/monorepos/
