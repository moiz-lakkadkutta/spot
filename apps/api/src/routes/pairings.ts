import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { db } from '../lib/db'
import { ok } from '../lib/http'
export const pairings: Router = Router()
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
pairings.post('/', async (req, res, next) => {
  try {
    const p = await db.person.upsert({ where: { deviceId: String(req.header('x-device-id') ?? 'anon') }, create: { deviceId: String(req.header('x-device-id') ?? 'anon') }, update: {} })
    const code = Array.from(randomBytes(6), (b) => ALPHA[b % ALPHA.length]).join('')
    await db.pairing.create({ data: { code, personId: p.id } })
    ok(res, { code }, 201)
  } catch (e) { next(e) }
})
