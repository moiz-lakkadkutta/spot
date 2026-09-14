/** Spot design tokens — docs/PLAN.md §7. Older-adult legibility: 36 px body, nothing under 30, no red anywhere. */
export type TypeRole = 'count' | 'display' | 'cue' | 'body' | 'label'
export const tokens = {
  color: {
    ground: '#121719', surface1: '#1B2225', surface2: '#232B2E',
    text: '#EDEEEA', textSecondary: '#A9B3B0',
    good: '#7FB89A',                 // going well / complete (sage)
    adjust: '#E0B072',               // one cue at a time (amber) — a suggestion, never an alarm
    interactive: '#8FB1C9',          // selected / primary button
    badge: '#7FB89A',
    focus: '#EDEEEA',
    error: '#E0B072',                // there is no red in Spot; connection problems use amber + words
  },
  type: {
    floor: 30,
    count:   { family: 'Lexend-Bold', weight: '700', size: 160, line: 160, tabular: true },
    display: { family: 'Lexend-SemiBold', weight: '700', size: 56, line: 64 },
    cue:     { family: 'Lexend-Regular', weight: '400', size: 44, line: 56 },
    body:    { family: 'Lexend-Regular', weight: '400', size: 36, line: 50 },
    label:   { family: 'Lexend-SemiBold', weight: '700', size: 30, line: 38, tracking: 0.02 },
  } as Record<TypeRole, { family: string; weight: '400' | '700'; size: number; line: number; tracking?: number; tabular?: boolean }> & { floor: number },
  layout: { safeX: 96, safeY: 54, rail: 96, railExpanded: 360, cardW: 412, cardH: 232, gutter: 24, demoW: 800, demoH: 450, buttonW: 720, buttonH: 120, rowH: 96 },
  focus: { width: 5, offset: 3 },
  motion: { focusMs: 150, focusScale: 1.04, cueMinGapMs: 10000, restDefaultS: 30 },
} as const
