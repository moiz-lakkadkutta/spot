import { Router } from 'express'
import { z } from 'zod'
import { Plan, SetResultDto } from '@spot/contracts'
import { db } from '../lib/db'
import { notFound, ok, validate } from '../lib/http'
export const sessions: Router = Router()
const person = async (h: unknown) => db.person.upsert({ where: { deviceId: String(h ?? 'anon') }, create: { deviceId: String(h ?? 'anon') }, update: {} })
sessions.post('/', validate(Plan, (r) => r.body), async (req, res, next) => {
  try {
    const p = await person(req.header('x-device-id')); const plan = (req as never as { valid: z.infer<typeof Plan> }).valid
    const prog = await db.programme.findUnique({ where: { slug: plan.programmeSlug } }); if (!prog) throw notFound('Programme')
    ok(res, await db.session.create({ data: { personId: p.id, programmeId: prog.id, planJson: plan } }), 201)
  } catch (e) { next(e) }
})
/** Persist each set as it completes — a dropped Wi-Fi never loses work. */
sessions.put('/:id/sets', validate(SetResultDto, (r) => r.body), async (req, res, next) => {
  try { const v = (req as never as { valid: z.infer<typeof SetResultDto> }).valid; ok(res, await db.setResult.create({ data: { sessionId: String(req.params.id), exerciseId: v.exerciseId, setIndex: v.setIndex, reps: v.reps, targetReps: v.targetReps, peakRange: v.peakRange, avgRepS: v.avgRepS, cuesJson: v.cues } }), 201) } catch (e) { next(e) }
})
sessions.put('/:id/finish', async (req, res, next) => {
  try { ok(res, await db.session.update({ where: { id: req.params.id }, data: { finishedAt: new Date(), completed: Boolean(req.body?.completed ?? true) } })) } catch (e) { next(e) }
})
