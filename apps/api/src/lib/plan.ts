import { Plan, type ExerciseSpec } from '@spot/contracts'
import { db } from './db'
/**
 * Today's plan. Deterministic rules first; Nova Lite (via Strands) only chooses *within* them (SPOT-005) and is schema-validated.
 * Progression: +2 reps only when the last two sessions hit target with ≥ 80 % in-range reps; never two changes at once; never above template max.
 */
export async function planToday(personId: string): Promise<Plan> {
  const person = await db.person.findUniqueOrThrow({ where: { id: personId }, include: { programme: true } })
  const prog = person.programme ?? (await db.programme.findFirstOrThrow({ orderBy: { name: 'asc' } }))
  const template = (prog.exercises as ExerciseSpec[]).slice(0, 3)
  const last = await db.session.findMany({ where: { personId, programmeId: prog.id, completed: true }, orderBy: { startedAt: 'desc' }, take: 2, include: { sets: true } })
  const exercises = template.map((e) => {
    const hits = last.filter((s) => s.sets.filter((x) => x.exerciseId === e.id).every((x) => x.reps >= x.targetReps && x.peakRange >= 80))
    const lastTarget = last[0]?.sets.find((x) => x.exerciseId === e.id)?.targetReps ?? e.reps
    const reps = hits.length === 2 && last.length === 2 ? Math.min(lastTarget + 2, 20) : lastTarget
    return { ...e, reps }
  })
  const minutes = [8, 12, 16].includes(person.sessionMinutes) ? person.sessionMinutes : 12
  return Plan.parse({ programmeSlug: prog.slug, minutes, exercises })
}
export const SUMMARY_BLOCKLIST = ['pain', 'injury', 'therapy', 'patient', 'diagnos', 'rehab', 'treat', 'medical', 'fall']
export function summaryIsSafe(text: string): boolean { const t = text.toLowerCase(); return !SUMMARY_BLOCKLIST.some((w) => t.includes(w)) }
