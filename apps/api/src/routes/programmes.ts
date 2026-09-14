import { Router } from 'express'
import { db } from '../lib/db'
import { ok } from '../lib/http'
export const programmes: Router = Router()
programmes.get('/', async (_req, res, next) => { try { ok(res, await db.programme.findMany({ orderBy: { name: 'asc' } })) } catch (e) { next(e) } })
/** Seeded by prisma/seed.ts: Mobility basics · Steadier on your feet · Sit-stand strength (3 exercises each, ≤ 12 min). */
