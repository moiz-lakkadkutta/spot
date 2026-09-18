/**
 * Hip-angle plot for a landmark fixture (or the synthetic series) — the thing to look at when calibrating SitToStand.
 *   pnpm --filter @spot/heuristics plot fixtures/<id>.json [--svg out.svg] [--width 120]
 *   pnpm --filter @spot/heuristics plot --synth [--svg out.svg]
 * Prints an ASCII chart of the shoulder–hip–knee angle (raw and 5-frame median) with the seated (100°) and standing
 * (160°) thresholds, rep marks from the current SitToStand tracker, and a summary. `--svg` also writes an SVG.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { LM, Median5, SitToStand, angle, mid, visible } from '../src'
import { Fixture, fixtureStats, syntheticFixture } from '../test/fixtures'

const args = process.argv.slice(2)
const opt = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
const file = args.find((a) => !a.startsWith('--') && a !== opt('--svg') && a !== opt('--width'))
const width = Number(opt('--width') ?? 100)
const SEATED = 100, STANDING = 160 // SitToStand thresholds (src/exercises.ts) — drawn, not changed here

let fx: Fixture
if (args.includes('--synth')) {
  fx = syntheticFixture({ id: 'synthetic' })
} else if (file) {
  fx = Fixture.parse(JSON.parse(readFileSync(file, 'utf8')))
} else { console.error('usage: plot <fixture.json> [--svg out.svg] [--width N] | plot --synth'); process.exit(2) }

/** Same hip metric as SitToStand: angle at the hip midpoint between shoulder and knee midpoints. NaN when not visible. */
const hipAngle = (f: Fixture['frames'][number]) => visible(f, [LM.lShoulder, LM.lHip, LM.lKnee, LM.rShoulder, LM.rHip, LM.rKnee]) ? angle(mid(f.lm[LM.lShoulder]!, f.lm[LM.rShoulder]!), mid(f.lm[LM.lHip]!, f.lm[LM.rHip]!), mid(f.lm[LM.lKnee]!, f.lm[LM.rKnee]!)) : NaN
const med = new Median5(), tracker = new SitToStand()
const raw: number[] = [], smooth: number[] = [], repAt: number[] = []
fx.frames.forEach((f, i) => { const a = hipAngle(f); raw.push(a); smooth.push(Number.isNaN(a) ? NaN : med.push(a)); if (tracker.tick(f).rep) repAt.push(i) })
const { seconds, fps } = fixtureStats(fx)
const finite = raw.filter((v) => !Number.isNaN(v))
const lo = Math.floor(Math.min(60, ...finite) / 10) * 10, hi = Math.ceil(Math.max(180, ...finite) / 10) * 10

// ASCII: `width` columns over time, 20 rows over [lo, hi]; '.' raw, '#' median, '-' thresholds, '|' rep marks.
const rows = 20, cols = Math.max(20, Math.min(width, fx.frames.length))
const bucket = (i: number) => Math.min(cols - 1, Math.floor((i / fx.frames.length) * cols))
const rowOf = (v: number) => rows - 1 - Math.round(((v - lo) / (hi - lo)) * (rows - 1))
const grid: string[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ' '))
for (const th of [SEATED, STANDING]) grid[rowOf(th)]!.fill('-')
raw.forEach((v, i) => { if (!Number.isNaN(v)) grid[rowOf(v)]![bucket(i)] = '.' })
smooth.forEach((v, i) => { if (!Number.isNaN(v)) grid[rowOf(v)]![bucket(i)] = '#' })
const marks = Array.from({ length: cols }, () => ' '); for (const i of repAt) marks[bucket(i)] = '|'
console.log(`${fx.id} · ${fx.exercise} · ${fx.camera} view · ${fx.path} · ${fx.phone.model} · ${fx.frames.length} frames · ${seconds.toFixed(1)} s · ${fps.toFixed(1)} fps`)
console.log(`hip angle (shoulder–hip–knee), '.' raw  '#' 5-frame median  '-' thresholds ${SEATED}°/${STANDING}°  '|' rep counted by SitToStand`)
grid.forEach((r, k) => { const v = hi - (k / (rows - 1)) * (hi - lo); console.log(`${String(Math.round(v)).padStart(4)}° |${r.join('')}`) })
console.log(`      +${'-'.repeat(cols)}`); console.log(`  rep  ${marks.join('')}`)
console.log(`      0 s${' '.repeat(Math.max(0, cols - 12))}${seconds.toFixed(0)} s`)
const notVisible = raw.filter((v) => Number.isNaN(v)).length
console.log(`min ${Math.min(...finite).toFixed(0)}°  max ${Math.max(...finite).toFixed(0)}°  frames without visible shoulders/hips/knees: ${notVisible} (${((100 * notVisible) / raw.length).toFixed(1)} %)`)
console.log(`SitToStand counted ${repAt.length} reps · manual count ${fx.manualReps} · ${repAt.length === fx.manualReps ? 'agree' : `differ by ${Math.abs(repAt.length - fx.manualReps)}`}`)

const svgPath = opt('--svg')
if (svgPath) {
  const W = 1200, H = 420, L = 60, B = 40
  const X = (i: number) => L + ((fx.frames[i]!.t - fx.frames[0]!.t) / 1000 / Math.max(seconds, 1e-3)) * (W - L - 20)
  const Y = (v: number) => 20 + ((hi - v) / (hi - lo)) * (H - B - 20)
  const path = (s: number[]) => s.map((v, i) => (Number.isNaN(v) ? 'M' : i === 0 || Number.isNaN(s[i - 1]!) ? 'M' : 'L') + `${X(i).toFixed(1)},${Y(Number.isNaN(v) ? lo : v).toFixed(1)}`).join(' ')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="sans-serif" font-size="12">
<rect width="${W}" height="${H}" fill="#121719"/>
${[SEATED, STANDING].map((th) => `<line x1="${L}" x2="${W - 20}" y1="${Y(th)}" y2="${Y(th)}" stroke="#A9B3B0" stroke-dasharray="4 4"/><text x="4" y="${Y(th) + 4}" fill="#A9B3B0">${th}°</text>`).join('\n')}
<path d="${path(raw)}" fill="none" stroke="#8FB1C9" stroke-width="1" opacity="0.6"/>
<path d="${path(smooth)}" fill="none" stroke="#7FB89A" stroke-width="2"/>
${repAt.map((i) => `<line x1="${X(i)}" x2="${X(i)}" y1="${H - B}" y2="${H - B + 12}" stroke="#E0B072" stroke-width="2"/>`).join('\n')}
<text x="${L}" y="${H - 8}" fill="#EDEEEA">${fx.id} · hip angle · thin = raw, thick = 5-frame median · ticks = reps counted (${repAt.length}) vs manual ${fx.manualReps}</text>
</svg>`
  writeFileSync(svgPath, svg); console.log(`wrote ${svgPath}`)
}
