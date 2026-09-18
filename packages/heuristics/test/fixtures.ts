/** Loader for real landmark fixtures in packages/heuristics/fixtures/*.json. Format: fixtures/README.md. */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { Camera, ExerciseId, Frame } from '@spot/contracts'
import { sideFrame, sitStandSeries } from './synth'

export const Fixture = z.object({
  schema: z.literal('spot.fixture.v1'),
  id: z.string().min(1),
  recordedAt: z.string().min(1),
  exercise: ExerciseId,
  camera: Camera,
  path: z.enum(['webview', 'native']),
  phone: z.object({ model: z.string(), os: z.string() }),
  fps: z.number().positive(),
  manualReps: z.number().int().min(0),
  manualRepAt: z.array(z.number()).optional(), // ms since first frame of each "+1" tap (recorder writes it; tests may ignore it)
  notes: z.string().default(''),
  frames: z.array(Frame).min(1),
}).superRefine((fx, ctx) => {
  for (let i = 1; i < fx.frames.length; i++) if (fx.frames[i]!.t < fx.frames[i - 1]!.t) { ctx.addIssue({ code: 'custom', message: `frames[${i}].t goes backwards`, path: ['frames', i, 't'] }); break }
})
export type Fixture = z.infer<typeof Fixture>

export const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/', import.meta.url))

/** All `*.json` fixtures in `dir`, sorted by file name. Throws (naming the file) on an invalid one. */
export function loadFixtures(dir: string = FIXTURES_DIR): Fixture[] {
  let names: string[]
  try { names = readdirSync(dir).filter((n) => n.endsWith('.json')).sort() } catch { return [] }
  return names.map((n) => {
    const parsed = Fixture.safeParse(JSON.parse(readFileSync(join(dir, n), 'utf8')))
    if (!parsed.success) throw new Error(`fixture ${n} is invalid: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
    return parsed.data
  })
}

/** Duration in seconds and mean fps of a fixture, from its frames. */
export function fixtureStats(fx: Pick<Fixture, 'frames'>): { seconds: number; fps: number } {
  const seconds = (fx.frames.at(-1)!.t - fx.frames[0]!.t) / 1000
  return { seconds, fps: seconds > 0 ? (fx.frames.length - 1) / seconds : 0 }
}

/**
 * A `spot.fixture.v1` file built from test/synth.ts — lets the loader, the plot script and the agreement test run before
 * any real fixture exists. `noise` adds deterministic per-frame wobble (image units) to every landmark; `dropEvery`
 * removes every n-th frame to imitate a stalled phone.
 */
export function syntheticFixture(opts: { id?: string; reps?: number; fps?: number; repMs?: number; noise?: number; dropEvery?: number } = {}): Fixture {
  const { id = 'synthetic-a', reps = 8, fps = 15, repMs = 3000, noise = 0, dropEvery = 0 } = opts
  let frames = sitStandSeries(reps, repMs, fps).map(({ t, hip }, i) => {
    const f = sideFrame(Math.round(t), hip)
    if (noise) f.lm = f.lm.map((p, k) => ({ ...p, x: p.x + noise * Math.sin(i * 1.7 + k * 0.9), y: p.y + noise * Math.cos(i * 1.3 + k * 0.7) }))
    return f
  })
  if (dropEvery > 1) frames = frames.filter((_, i) => i % dropEvery !== dropEvery - 1)
  const manualRepAt = Array.from({ length: reps }, (_, r) => Math.round(r * repMs + repMs * 0.6)) // roughly when the person is up
  return { schema: 'spot.fixture.v1', id, recordedAt: '2026-09-18T00:00:00.000Z', exercise: 'sit_to_stand', camera: 'side', path: 'webview', phone: { model: 'synthetic', os: 'none' }, fps: Math.round(fixtureStats({ frames }).fps * 10) / 10, manualReps: reps, manualRepAt, notes: `test/synth.ts sitStandSeries(${reps}, ${repMs}, ${fps})${noise ? ` noise ${noise}` : ''}${dropEvery ? ` dropEvery ${dropEvery}` : ''}`, frames }
}
