# 0002 — Wording (MDR-safe)

Under the EU MDR, software is a medical device through its *intended purpose*. MDCG 2019-11 excludes general wellness apps without medical claims.
Spot is "guided exercise and movement coaching for mobility and wellbeing". It does not rehabilitate, treat, diagnose, monitor patients or prevent falls.
The share-out is "an activity summary you may choose to share". First run carries the notice in `strings.notice`.
Also: never "fail", "wrong", "bad form" — cues are instructions ("Stand up tall"), not judgments. Enforced by `pnpm lint:words`
for `packages/shared-ui/src/**` and `apps/phone/src/**` (blocklist in `scripts/lint-words.mjs`). The weekly summary generator applies the same list to model output.
