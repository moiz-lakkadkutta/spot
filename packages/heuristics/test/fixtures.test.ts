import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { trackerFor } from '../src'
import { Fixture, loadFixtures, fixtureStats, syntheticFixture } from './fixtures'

/** Run the exercise's tracker over every frame and count reps. */
function countReps(fx: Fixture): number {
  const tr = trackerFor(fx.exercise); let reps = 0
  for (const f of fx.frames) if (tr.tick(f).rep) reps++
  return reps
}

const fixtures = loadFixtures()
describe('real fixtures (packages/heuristics/fixtures/*.json)', () => {
  if (fixtures.length === 0) {
    it.skip('SKIPPED: no real fixtures recorded yet — record three sit-to-stand sessions per docs/spikes/SPOT-001-pose.md §3, then this test runs', () => {})
    return
  }
  it.each(fixtures.map((fx) => [fx.id, fx] as const))('%s: tracker rep count is within 5 %% of the manual count', (_id, fx) => {
    const reps = countReps(fx)
    expect(Math.abs(reps - fx.manualReps)).toBeLessThanOrEqual(Math.ceil(fx.manualReps * 0.05))
  })
  it('aggregate agreement with the manual count is ≥ 95 % (SPOT-002 acceptance)', () => {
    const manual = fixtures.reduce((s, fx) => s + fx.manualReps, 0)
    const miss = fixtures.reduce((s, fx) => s + Math.abs(countReps(fx) - fx.manualReps), 0)
    expect(1 - miss / manual).toBeGreaterThanOrEqual(0.95)
  })
})

describe('fixture loader', () => {
  const synthetic = (): Fixture => syntheticFixture()
  it('returns [] for a missing folder and loads + validates a fixture from a folder', () => {
    expect(loadFixtures(join(tmpdir(), 'does-not-exist-spot'))).toEqual([])
    const dir = mkdtempSync(join(tmpdir(), 'spot-fx-'))
    writeFileSync(join(dir, 'synthetic-a.json'), JSON.stringify(synthetic()))
    writeFileSync(join(dir, 'README.md'), 'ignored')
    const [fx] = loadFixtures(dir)
    expect(fx?.id).toBe('synthetic-a'); expect(fx?.frames).toHaveLength(360); expect(fx?.manualRepAt).toHaveLength(8)
    expect(fixtureStats(fx!).fps).toBeCloseTo(15, 0)
    expect(countReps(fx!)).toBe(8)
  })
  it('rejects a fixture whose frames do not have 33 landmarks or whose t goes backwards', () => {
    const dir = mkdtempSync(join(tmpdir(), 'spot-fx-'))
    const bad = synthetic(); bad.frames[3]!.lm = bad.frames[3]!.lm.slice(0, 32)
    writeFileSync(join(dir, 'bad.json'), JSON.stringify(bad))
    expect(() => loadFixtures(dir)).toThrow(/bad\.json is invalid: frames\.3\.lm/)
    const dir2 = mkdtempSync(join(tmpdir(), 'spot-fx-'))
    const back = synthetic(); back.frames[5]!.t = 0
    writeFileSync(join(dir2, 'back.json'), JSON.stringify(back))
    expect(() => loadFixtures(dir2)).toThrow(/goes backwards/)
  })
})

describe('synthetic fixture (stand-in until real ones exist)', () => {
  it('round-trips through JSON + the Zod schema, and a noisy, gappy one still counts 8 reps', () => {
    const fx = Fixture.parse(JSON.parse(JSON.stringify(syntheticFixture({ id: 'synthetic-b', noise: 0.003, dropEvery: 7, fps: 30 }))))
    expect(fx.frames.length).toBe(720 - Math.floor(720 / 7))
    expect(fx.fps).toBeGreaterThan(24); expect(fx.fps).toBeLessThan(30)
    expect(countReps(fx)).toBe(8)
  })
})
