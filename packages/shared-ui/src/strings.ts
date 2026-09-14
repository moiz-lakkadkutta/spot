/** Plain language, ≤ 12 words on the exercise screen, no medical vocabulary (see docs/decisions/0002-wording.md; enforced by pnpm lint:words). */
export const strings = {
  notice: 'Spot is not a medical device and does not diagnose or treat any condition. Talk to a healthcare professional before starting, and stop if you feel dizzy or unwell.', // lint-words-allow: required notice
  firstRun: { p1: 'Spot helps you do your movement exercises with a coach who counts.', p2: 'I understand', p3: 'Your phone is the camera. It never sends pictures — only the shape of your movement.', name: 'Your name? (optional)', skip: 'Skip' },
  home: { today: "Today's session", meta: (n: number, m: number) => `${n} exercises · about ${m} minutes`, start: 'Start', connect: 'Connect your phone', programmes: 'Programmes', past: 'Past sessions' },
  framing: { title: 'Set your phone on the table, sideways, about 3 steps away.', front: 'Now turn to face the phone.', head: 'head', hips: 'hips', feet: 'feet', stepBack: 'Step back a little so we see your feet.', dark: "It's a bit dark — turn on a lamp if you can.", lost: 'Your phone lost connection. Reconnecting…', manual: 'Count on my own', skip: 'Skip check', phone: (name: string, pct: number) => `${name} · battery ${pct}%` },
  exercise: { of: (n: number) => `of ${n}`, set: (i: number, n: number) => `Set ${i} of ${n}`, paused: 'Paused. Press to continue.', endQ: (n: number, ex: string) => `End the session? You've done ${n} ${ex}.`, keep: 'Keep going', finish: 'Finish', cantSee: "We can't see your hips — step back." },
  rest: { title: 'Rest', next: 'Next', skip: 'Skip rest' },
  summary: { title: 'Well done.', early: (n: number, ex: string) => `You did ${n} ${ex}. That counts.`, done: 'Done', share: 'Share with someone', remind: 'Remind me tomorrow', better: (ex: string) => `Your ${ex} went higher than last week.`, same: 'About the same as last week.' },
  names: { sit_to_stand: 'Sit to stand', heel_raise: 'Heel raises', arm_raise: 'Arm raises', knee_straighten: 'Knee straightening', supported_squat: 'Supported squats' },
  plural: { sit_to_stand: 'stands', heel_raise: 'heel raises', arm_raise: 'arm raises', knee_straighten: 'knee straightens', supported_squat: 'squats' },
  cues: {
    stand_tall: 'Stand up tall.', slower_down: 'Slower on the way down.', hold_chair: 'Hold the chair and stay upright.', arm_straight: 'Keep your arm straight.', both_arms: 'Both arms together.', hold_two: 'Hold it… two, one.', chest_up: 'Chest up.', sit_back: 'Sit back into it.', watch_knees: 'Watch your knees.',
  },
  settings: { text: 'Text size', large: 'Large', larger: 'Larger', voice: 'Voice', length: 'Session length', rest: 'Rest length', pair: 'Pair a phone', share: 'Share summaries automatically', about: 'About & notice' },
  rail: { today: 'Today', programmes: 'Programmes', history: 'History', settings: 'Settings' },
  history: { empty: 'Your first session will show up here.' },
  offline: 'Can\u2019t reach Spot right now. Check the network and press Select to try again.',
}
