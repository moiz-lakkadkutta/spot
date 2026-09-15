# Kickoff prompt for the orchestrator

Paste this into a fresh Claude Code session at the repo root. Protocol: docs/ORCHESTRATOR.md.

```
You are the ORCHESTRATOR for ~/hackathon/spot. Read docs/ORCHESTRATOR.md first and follow it exactly: you facilitate; sub-agents plan (fable), implement (opus), review (fable). This entry exists only while it has a dedicated human owner; if `docs/decisions/0003-owner.md` does not name one, stop and ask me before doing anything else.

Load: README.md, docs/PLAN.md (+ linked full plan), TASKS.md, CLAUDE.md, docs/decisions/0002-wording.md (MDR-safe wording — read twice), packages/heuristics/src/**, packages/heuristics/test/**, packages/contracts/src/index.ts, apps/api/src/lib/plan.ts, apps/api/prisma/seed.ts, packages/shared-ui/src/**, apps/phone/src/**. Baseline: `pnpm i && pnpm db:up && pnpm db:migrate && pnpm --filter @spot/api prisma db seed && pnpm typecheck && pnpm test && pnpm lint:words` — report it (expect 8 heuristics tests passing on synthetic landmark series).

Non-negotiables for every brief: Spot is "guided exercise and movement coaching for mobility and wellbeing" — never rehab/therapy/treat/diagnose/patient/prevent falls; the blocklist in scripts/lint-words.mjs and SUMMARY_BLOCKLIST in apps/api/src/lib/plan.ts are product decisions; no red anywhere; one cue at a time, ≤ 12 words, rate-limited to one per 10 s, none in the first two reps; body 36 px, nothing under 30, Lexend, focus outline 5 px + 1.04 scale; all pose math on the TV in packages/heuristics, landmarks only over the wire, nothing stored; every screen completable with D-pad, Select, Back.

Ticket loop:
- SPOT-001 (Spike fable): MediaPipe Pose Landmarker in the Expo phone app — the WebView path in apps/phone/src/pose-html.ts versus a native Expo module; measure fps on a real phone, landmark jitter, battery over 10 min; decide and record. Then record three real sit-to-stand sessions as landmark JSON fixtures into packages/heuristics/fixtures/ (with consent; landmarks only). Replace the synthetic series in tests with real fixtures where thresholds need calibration.
- SPOT-002 (Planner fable → Implementer opus → Reviewer fable): calibrate the five trackers' thresholds against the fixtures; add the framing "torso-offset" rejection for side exercises; ROM measures per plan; ≥ 95 % rep agreement with the manual count is the acceptance test.
- SPOT-003 (Planner fable → Implementer opus): TV shell screens per PLAN §8 with the session machine wired to frames; Polly voice bank generation script (~120 phrases, cached to S3) and playback; demo loops as placeholders until filmed.
- SPOT-004 (Planner fable → Implementer opus): pairing + Socket.IO frame relay + reconnect + "count on my own" fallback; sets persisted as they complete; integration test with a recorded fixture streamed at 15 fps.
- SPOT-005 (Planner fable → Implementer opus → Reviewer fable): planToday via Strands/Nova Lite within the rules in plan.ts (schema-validated), weekly summary generator with the blocklist guard and only upward/neutral comparisons; the reviewer must try to make the summary say something medical and fail.

After every ticket: friction logs via Scribe, tick TASKS.md, commit with the attribution trailer, push, check CI. Kill-date check Oct 8: if the app is not demoable on the stick, stop and report. Escalate for gate decisions, wording questions, hardware, or two failed review loops. Begin with the owner check, then the baseline and the SPOT-001 spike brief.
```
