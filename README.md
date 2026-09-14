# Spot

**Guided movement coaching for mobility and wellbeing on the living-room TV.** Your phone is the camera (on-device pose
detection; it never sends pictures), the TV is the coach that counts repetitions, measures range and says the one thing that
helps. Designed for the person a physio would most like to see finish their home exercises: over sixty, alone, no patience for gadgets.

> Spot is not a medical device and does not diagnose or treat any condition. Talk to a healthcare professional before starting,
> and stop if you feel dizzy or unwell.

Built for the [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/) — Fire TV track + AWS Builder.
Conditional entry: built only with a dedicated owner (see runbook). MIT.

## Run it
1. `pnpm i` · `cp .env.example .env` · `pnpm db:up` · `pnpm db:migrate` · `pnpm --filter @spot/api prisma db seed`
2. `pnpm api` (:4000) · `pnpm expo` (Fire OS) · `pnpm --filter @spot/phone start` (phone camera)
3. `pnpm test` runs the heuristics against recorded landmark fixtures (`packages/heuristics/fixtures`).

## Architecture
```
Phone (Expo): camera → MediaPipe Pose (33 landmarks) → framing check → Socket.IO frame stream (≤ 15 fps, ~4 KB/frame)
TV (vega/expo → shared-ui): SessionMachine (packages/heuristics) → count · range bar · one cue → voice bank (Polly, cached)
apps/api: rooms by pairing code (relay only) · programmes · today's plan (Nova Lite via Strands, schema-validated) · sets persisted as they complete · weekly summary (blocklist-checked)
```
Plan: [docs/PLAN.md](docs/PLAN.md) · Tickets: [TASKS.md](TASKS.md) · Wording rules: [docs/decisions/0002-wording.md](docs/decisions/0002-wording.md)
