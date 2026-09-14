import { Router } from 'express'
import { PersonDto } from '@spot/contracts'
import { db } from '../lib/db'
import { ok, validate } from '../lib/http'
import { planToday } from '../lib/plan'
export const me: Router = Router()
const person = async (h: unknown) => db.person.upsert({ where: { deviceId: String(h ?? 'anon') }, create: { deviceId: String(h ?? 'anon') }, update: {}, include: { programme: true } })
me.get('/', async (req, res, next) => { try { ok(res, await person(req.header('x-device-id'))) } catch (e) { next(e) } })
me.put('/', validate(PersonDto.partial(), (r) => r.body), async (req, res, next) => {
  try {
    const p = await person(req.header('x-device-id')); const v = (req as never as { valid: Partial<{ programmeSlug: string | null }> & Record<string, unknown> }).valid
    const { programmeSlug, ...rest } = v
    const prog = programmeSlug ? await db.programme.findUnique({ where: { slug: programmeSlug } }) : undefined
    ok(res, await db.person.update({ where: { id: p.id }, data: { ...rest, ...(prog ? { programmeId: prog.id } : {}) } }))
  } catch (e) { next(e) }
})
/** Today's plan: template + last three sessions → Nova Lite picks within rules (progression: +2 reps only after two target hits with ≥ 80 % in-range). */
me.get('/today', async (req, res, next) => {
  try { const p = await person(req.header('x-device-id')); ok(res, await planToday(p.id)) } catch (e) { next(e) }
})
me.get('/summary', async (req, res, next) => {
  try { const p = await person(req.header('x-device-id')); ok(res, await db.summary.findFirst({ where: { personId: p.id }, orderBy: { weekStart: 'desc' } })) } catch (e) { next(e) }
})
