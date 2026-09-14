import type { ExerciseId, ExerciseSpec, Frame as FrameDto, Plan } from '@spot/contracts'
import { trackerFor, type CueKey, type ExerciseTracker } from './exercises'
import type { Frame } from './landmarks'
export interface SessionOut { reps: number; rangePct: number; inRange: boolean; cue: CueKey | null; setDone: boolean; visible: boolean }
/**
 * Session state machine: exercises × sets. Cue policy: at most one cue per 10 s, never during the first two reps,
 * visibility loss pauses counting. Results are per set for the API (`PUT /sessions/:id/sets`).
 */
export class SessionMachine {
  private i = 0; private set = 0; private reps = 0; private tracker: ExerciseTracker; private lastCueAt = -Infinity; private repTimes: number[] = []; private peak = 0
  private out: Array<{ exerciseId: ExerciseId; setIndex: number; reps: number; targetReps: number; peakRange: number; avgRepS: number; cues: CueKey[] }> = []
  private cues: CueKey[] = []
  constructor(private plan: Plan) { this.tracker = trackerFor(plan.exercises[0]!.id) }
  current(): { spec: ExerciseSpec; setIndex: number } { return { spec: this.plan.exercises[this.i]!, setIndex: this.set } }
  hasNext(): boolean { const s = this.plan.exercises[this.i]!; return this.set + 1 < s.sets || this.i + 1 < this.plan.exercises.length }
  frame(f: FrameDto): SessionOut {
    const t = this.tracker.tick(f as Frame)
    if (!t.visible) return { reps: this.reps, rangePct: t.rangePct, inRange: false, cue: null, setDone: false, visible: false }
    this.peak = Math.max(this.peak, t.rangePct)
    if (t.rep) { this.reps++; this.repTimes.push(f.t) }
    let cue: CueKey | null = null
    if (t.cue && this.reps >= 2 && f.t - this.lastCueAt >= 10000) { cue = t.cue; this.lastCueAt = f.t; this.cues.push(cue) }
    const spec = this.plan.exercises[this.i]!
    const setDone = this.reps >= spec.reps
    if (setDone) this.finishSet()
    return { reps: setDone ? spec.reps : this.reps, rangePct: t.rangePct, inRange: t.inRange, cue, setDone, visible: true }
  }
  /** Finish the current set early (user pressed Finish). */
  finishSet() {
    const spec = this.plan.exercises[this.i]!
    const avg = this.repTimes.length > 1 ? (this.repTimes.at(-1)! - this.repTimes[0]!) / 1000 / (this.repTimes.length - 1) : 0
    this.out.push({ exerciseId: spec.id, setIndex: this.set, reps: this.reps, targetReps: spec.reps, peakRange: this.peak, avgRepS: avg, cues: this.cues })
    this.reps = 0; this.repTimes = []; this.peak = 0; this.cues = []; this.lastCueAt = -Infinity
    if (this.set + 1 < spec.sets) this.set++
    else if (this.i + 1 < this.plan.exercises.length) { this.i++; this.set = 0; this.tracker = trackerFor(this.plan.exercises[this.i]!.id) }
    this.tracker.reset()
  }
  results() { return this.out.map((r) => ({ exerciseId: r.exerciseId, reps: r.reps })) }
  sets() { return this.out }
}
