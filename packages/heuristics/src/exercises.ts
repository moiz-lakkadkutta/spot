import type { ExerciseId } from '@spot/contracts'
import { LM, Median5, angle, bodyHeight, fromVertical, mid, visible, type Frame } from './landmarks'
export type CueKey = 'stand_tall' | 'slower_down' | 'hold_chair' | 'arm_straight' | 'both_arms' | 'hold_two' | 'chest_up' | 'sit_back' | 'watch_knees'
export interface Tick { rep: boolean; rangePct: number; inRange: boolean; cue?: CueKey; visible: boolean }
export interface ExerciseTracker { id: ExerciseId; camera: 'side' | 'front'; needed: number[]; tick(f: Frame): Tick; reset(): void }

/** Generic two-threshold rep counter: enter "down/active" when metric crosses `lo` in the given direction, count when it returns past `hi`. */
class TwoState {
  phase: 'up' | 'down' = 'up'; lastRepAt = 0; lastDownAt = 0
  constructor(private lo: number, private hi: number, private downIsLess = true) {}
  step(v: number, t: number): { rep: boolean; repS?: number } {
    const isDown = this.downIsLess ? v < this.lo : v > this.lo
    const isUp = this.downIsLess ? v > this.hi : v < this.hi
    if (this.phase === 'up' && isDown) { this.phase = 'down'; this.lastDownAt = t; return { rep: false } }
    if (this.phase === 'down' && isUp) { this.phase = 'up'; const repS = (t - this.lastRepAt) / 1000; this.lastRepAt = t; return { rep: true, repS } }
    return { rep: false }
  }
  reset() { this.phase = 'up'; this.lastRepAt = 0 }
}
const pct = (v: number, lo: number, hi: number) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))

/** Sit-to-stand (side): hip angle shoulder–hip–knee < 100° seated → > 160° standing. Cues: standing < 150° for 1 s → stand_tall; rep < 1.2 s → slower_down. */
export class SitToStand implements ExerciseTracker {
  id = 'sit_to_stand' as const; camera = 'side' as const; needed = [LM.lShoulder, LM.lHip, LM.lKnee, LM.rShoulder, LM.rHip, LM.rKnee]
  private sm = new TwoState(100, 160); private med = new Median5(); private peak = 0; private standingSince: number | null = null
  tick(f: Frame): Tick {
    if (!visible(f, this.needed)) return { rep: false, rangePct: 0, inRange: false, visible: false }
    const hip = this.med.push(angle(mid(f.lm[LM.lShoulder]!, f.lm[LM.rShoulder]!), mid(f.lm[LM.lHip]!, f.lm[LM.rHip]!), mid(f.lm[LM.lKnee]!, f.lm[LM.rKnee]!)))
    this.peak = Math.max(this.peak, hip)
    const { rep, repS } = this.sm.step(hip, f.t)
    let cue: CueKey | undefined
    if (hip > 130 && hip < 150) { this.standingSince ??= f.t; if (f.t - this.standingSince > 1000) cue = 'stand_tall' } else this.standingSince = null
    if (rep && repS !== undefined && repS < 1.2) cue = 'slower_down'
    const out: Tick = { rep, rangePct: pct(this.peak, 100, 170), inRange: this.peak >= 160, cue, visible: true }
    if (rep) this.peak = 0
    return out
  }
  reset() { this.sm.reset(); this.med.reset(); this.peak = 0 }
}
/** Heel raises (side): heel rises > 3 % of body height above its baseline. Cue: trunk lean > 15° → hold_chair. */
export class HeelRaise implements ExerciseTracker {
  id = 'heel_raise' as const; camera = 'side' as const; needed = [LM.lHeel, LM.rHeel, LM.lAnkle, LM.rAnkle, LM.lShoulder, LM.lHip, LM.nose]
  private base: number | null = null; private sm = new TwoState(0.03, 0.01, false); private med = new Median5(); private peak = 0
  tick(f: Frame): Tick {
    if (!visible(f, this.needed)) return { rep: false, rangePct: 0, inRange: false, visible: false }
    const heelY = mid(f.lm[LM.lHeel]!, f.lm[LM.rHeel]!).y
    this.base = this.base === null ? heelY : Math.max(this.base, heelY) // baseline = lowest point (largest y)
    const lift = this.med.push((this.base - heelY) / Math.max(bodyHeight(f), 1e-3))
    this.peak = Math.max(this.peak, lift)
    const { rep } = this.sm.step(lift, f.t)
    const lean = fromVertical(mid(f.lm[LM.lHip]!, f.lm[LM.rHip]!), mid(f.lm[LM.lShoulder]!, f.lm[LM.rShoulder]!))
    const out: Tick = { rep, rangePct: pct(this.peak, 0, 0.06), inRange: this.peak >= 0.03, cue: lean > 15 ? 'hold_chair' : undefined, visible: true }
    if (rep) this.peak = 0
    return out
  }
  reset() { this.base = null; this.sm.reset(); this.med.reset(); this.peak = 0 }
}
/** Arm raise (front): hip–shoulder–wrist > 150° up, < 60° down. Cues: elbow < 150° at top → arm_straight; shoulders differ > 8° → both_arms. */
export class ArmRaise implements ExerciseTracker {
  id = 'arm_raise' as const; camera = 'front' as const; needed = [LM.lShoulder, LM.rShoulder, LM.lElbow, LM.rElbow, LM.lWrist, LM.rWrist, LM.lHip, LM.rHip]
  private sm = new TwoState(150, 60, false); private med = new Median5(); private peak = 0
  tick(f: Frame): Tick {
    if (!visible(f, this.needed)) return { rep: false, rangePct: 0, inRange: false, visible: false }
    const l = angle(f.lm[LM.lHip]!, f.lm[LM.lShoulder]!, f.lm[LM.lWrist]!), r = angle(f.lm[LM.rHip]!, f.lm[LM.rShoulder]!, f.lm[LM.rWrist]!)
    const a = this.med.push((l + r) / 2)
    this.peak = Math.max(this.peak, a)
    const { rep } = this.sm.step(a, f.t)
    let cue: CueKey | undefined
    if (a > 140) { const elbow = Math.min(angle(f.lm[LM.lShoulder]!, f.lm[LM.lElbow]!, f.lm[LM.lWrist]!), angle(f.lm[LM.rShoulder]!, f.lm[LM.rElbow]!, f.lm[LM.rWrist]!)); if (elbow < 150) cue = 'arm_straight' }
    if (Math.abs(l - r) > 8 && a > 90) cue = 'both_arms'
    const out: Tick = { rep, rangePct: pct(this.peak, 60, 175), inRange: this.peak >= 150, cue, visible: true }
    if (rep) this.peak = 0
    return out
  }
  reset() { this.sm.reset(); this.med.reset(); this.peak = 0 }
}
/** Seated knee straightening (side): knee angle hip–knee–ankle > 160° straight, < 110° bent. Hold < 2 s → hold_two. */
export class KneeStraighten implements ExerciseTracker {
  id = 'knee_straighten' as const; camera = 'side' as const; needed = [LM.lHip, LM.lKnee, LM.lAnkle, LM.rHip, LM.rKnee, LM.rAnkle]
  private sm = new TwoState(160, 110, false); private med = new Median5(); private peak = 0; private straightSince: number | null = null; private held = 0
  tick(f: Frame): Tick {
    if (!visible(f, this.needed)) return { rep: false, rangePct: 0, inRange: false, visible: false }
    const k = this.med.push(Math.max(angle(f.lm[LM.lHip]!, f.lm[LM.lKnee]!, f.lm[LM.lAnkle]!), angle(f.lm[LM.rHip]!, f.lm[LM.rKnee]!, f.lm[LM.rAnkle]!)))
    this.peak = Math.max(this.peak, k)
    if (k > 160) { this.straightSince ??= f.t; this.held = f.t - this.straightSince } else this.straightSince = null
    const { rep } = this.sm.step(k, f.t)
    const out: Tick = { rep, rangePct: pct(this.peak, 110, 178), inRange: this.peak >= 160, cue: rep && this.held < 2000 ? 'hold_two' : undefined, visible: true }
    if (rep) { this.peak = 0; this.held = 0 }
    return out
  }
  reset() { this.sm.reset(); this.med.reset(); this.peak = 0; this.held = 0 }
}
/** Supported squat (side): knee-to-vertical > 35° down, < 20° up. Cues: hip lean > 45° → chest_up; knee past toes → sit_back. */
export class SupportedSquat implements ExerciseTracker {
  id = 'supported_squat' as const; camera = 'side' as const; needed = [LM.lHip, LM.lKnee, LM.lAnkle, LM.lShoulder, LM.lFoot]
  private sm = new TwoState(35, 20, false); private med = new Median5(); private peak = 0
  tick(f: Frame): Tick {
    if (!visible(f, this.needed)) return { rep: false, rangePct: 0, inRange: false, visible: false }
    const kneeV = this.med.push(fromVertical(f.lm[LM.lKnee]!, f.lm[LM.lAnkle]!))
    this.peak = Math.max(this.peak, kneeV)
    const { rep } = this.sm.step(kneeV, f.t)
    let cue: CueKey | undefined
    const hipV = fromVertical(f.lm[LM.lShoulder]!, f.lm[LM.lHip]!)
    if (kneeV > 30 && hipV > 45) cue = 'chest_up'
    if (kneeV > 30 && Math.abs(f.lm[LM.lKnee]!.x - f.lm[LM.lAnkle]!.x) > Math.abs(f.lm[LM.lFoot]!.x - f.lm[LM.lAnkle]!.x) * 1.3) cue = 'sit_back'
    const out: Tick = { rep, rangePct: pct(this.peak, 20, 95), inRange: this.peak >= 75 || (this.peak >= 35 && this.peak < 65), cue, visible: true }
    if (rep) this.peak = 0
    return out
  }
  reset() { this.sm.reset(); this.med.reset(); this.peak = 0 }
}
export function trackerFor(id: ExerciseId): ExerciseTracker {
  switch (id) { case 'sit_to_stand': return new SitToStand(); case 'heel_raise': return new HeelRaise(); case 'arm_raise': return new ArmRaise(); case 'knee_straighten': return new KneeStraighten(); case 'supported_squat': return new SupportedSquat() }
}
