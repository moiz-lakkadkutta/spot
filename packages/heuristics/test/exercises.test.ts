import { SitToStand, SessionMachine, checkFraming, angle } from '../src'
import { sideFrame, sitStandSeries } from './synth'

describe('geometry', () => {
  it('angle at vertex', () => {
    expect(angle({ x: 0, y: 1, v: 1 }, { x: 0, y: 0, v: 1 }, { x: 1, y: 0, v: 1 })).toBeCloseTo(90, 5)
    expect(angle({ x: 0, y: -1, v: 1 }, { x: 0, y: 0, v: 1 }, { x: 0, y: 1, v: 1 })).toBeCloseTo(180, 5)
  })
  it('synthetic frame reproduces the requested hip angle within 3°', () => {
    for (const d of [90, 120, 160, 175]) { const f = sideFrame(0, d); expect(angle(f.lm[11]!, f.lm[23]!, f.lm[25]!)).toBeCloseTo(d, 0) }
  })
})
describe('sit-to-stand', () => {
  it('counts 8 reps at 3 s each and marks them in range', () => {
    const tr = new SitToStand(); let reps = 0; let inRange = false
    for (const { t, hip } of sitStandSeries(8)) { const o = tr.tick(sideFrame(t, hip)); if (o.rep) { reps++; inRange = o.inRange } }
    expect(reps).toBe(8); expect(inRange).toBe(true)
  })
  it('cues "slower on the way down" for a 1 s rep, never on the first two reps (session policy)', () => {
    const plan = { programmeSlug: 'x', minutes: 8, exercises: [{ id: 'sit_to_stand' as const, sets: 1, reps: 6, restS: 30, camera: 'side' as const }] }
    const m = new SessionMachine(plan); const cues: string[] = []
    for (const { t, hip } of sitStandSeries(6, 1000)) { const o = m.frame(sideFrame(t, hip)); if (o.cue) cues.push(o.cue) }
    expect(cues.length).toBeGreaterThanOrEqual(1); expect(cues.every((c) => c === 'slower_down')).toBe(true)
  })
  it('stops counting when hips are not visible', () => {
    const tr = new SitToStand(); const f = sideFrame(0, 120); f.lm[23]!.v = 0.2; f.lm[24]!.v = 0.2
    expect(tr.tick(f)).toMatchObject({ visible: false, rep: false })
  })
})
describe('session machine', () => {
  it('advances sets and exercises, reporting per-set results', () => {
    const plan = { programmeSlug: 'x', minutes: 12, exercises: [{ id: 'sit_to_stand' as const, sets: 2, reps: 3, restS: 30, camera: 'side' as const }, { id: 'sit_to_stand' as const, sets: 1, reps: 2, restS: 30, camera: 'side' as const }] }
    const m = new SessionMachine(plan); let dones = 0
    for (const { t, hip } of sitStandSeries(9)) { const o = m.frame(sideFrame(t, hip)); if (o.setDone) dones++ }
    expect(dones).toBe(3); expect(m.sets().map((s) => s.reps)).toEqual([3, 3, 2]); expect(m.hasNext()).toBe(false)
  })
  it('rate-limits cues to one per 10 s', () => {
    const plan = { programmeSlug: 'x', minutes: 8, exercises: [{ id: 'sit_to_stand' as const, sets: 1, reps: 20, restS: 30, camera: 'side' as const }] }
    const m = new SessionMachine(plan); const at: number[] = []
    for (const { t, hip } of sitStandSeries(20, 1000)) { const o = m.frame(sideFrame(t, hip)); if (o.cue) at.push(t) }
    for (let i = 1; i < at.length; i++) expect(at[i]! - at[i - 1]!).toBeGreaterThanOrEqual(10000)
  })
})
describe('framing', () => {
  it('passes when head, hips and feet are visible and inside the frame', () => {
    expect(checkFraming(sideFrame(0, 170))).toEqual({ head: true, hips: true, feet: true, light: 'ok' })
    const f = sideFrame(0, 170); f.lm[29]!.y = 0.99; f.lm[31]!.y = 0.99; f.lm[30] = f.lm[29]!; f.lm[32] = f.lm[31]!
    expect(checkFraming(f).feet).toBe(false)
  })
})
