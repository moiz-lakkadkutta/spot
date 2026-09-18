/**
 * Write a synthetic `spot.fixture.v1` file so the loader, `plot` and the agreement test can be exercised before real
 * recordings exist. Writes OUTSIDE fixtures/ by default on purpose: anything in fixtures/*.json is treated as real data.
 *   pnpm --filter @spot/heuristics synth-fixture <out.json> [--reps 8] [--fps 15] [--rep-ms 3000] [--noise 0.003] [--drop-every 7]
 * Then: pnpm --filter @spot/heuristics plot <out.json>
 */
import { writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { syntheticFixture } from '../test/fixtures'

const args = process.argv.slice(2)
const opt = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
const out = args.find((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1]!.startsWith('--')))
if (!out) { console.error('usage: synth-fixture <out.json> [--reps N] [--fps N] [--rep-ms N] [--noise X] [--drop-every N]'); process.exit(2) }
if (/(^|\/)fixtures\/[^/]+\.json$/.test(out) && !args.includes('--i-know-this-is-fake')) { console.error(`refusing to write a synthetic file into fixtures/ (it would be taken for a real recording); pass --i-know-this-is-fake to override`); process.exit(2) }
const num = (k: string, d: number) => { const v = opt(k); return v === undefined ? d : Number(v) }
const fx = syntheticFixture({ id: basename(out).replace(/\.json$/, ''), reps: num('--reps', 8), fps: num('--fps', 15), repMs: num('--rep-ms', 3000), noise: num('--noise', 0), dropEvery: num('--drop-every', 0) })
writeFileSync(out, JSON.stringify(fx))
console.log(`wrote ${out}: ${fx.frames.length} frames · ${fx.fps} fps · ${fx.manualReps} reps · ${(JSON.stringify(fx).length / 1024).toFixed(0)} kB`)
