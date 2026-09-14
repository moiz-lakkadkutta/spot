# Spot — plan

Full plan: https://claude.ai/code/artifact/7017bd0f-1342-4b8b-8161-0c6b8f8b18f7 · Runbook: https://claude.ai/code/artifact/333837e3-60c1-41e3-b028-fccee0af96c4

## Non-negotiables
- MDR-safe wording everywhere (docs/decisions/0002-wording.md). No red anywhere. One cue at a time, ≤ 12 words, rate-limited to one per 10 s, none during the first two reps.
- Body 36 px, nothing under 30; Lexend; focus outline 5 px + 1.04 scale.
- All pose math on the TV (packages/heuristics), landmarks only over the wire, nothing stored.
- Heuristics (starting thresholds, calibrated in week 1): sit-to-stand hip < 100° → > 160°; heel raise lift > 3 % body height; arm raise > 150° (elbow ≥ 150° straight); knee straighten > 160°; squat knee-vertical 35–65° partial / 75–95° full.
