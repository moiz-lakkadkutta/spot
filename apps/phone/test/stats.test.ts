import { describe, expect, it } from 'vitest'
import { DelayMeter, J, buildFixture, fpsOf, gaps, jitter, percentile, stddev, type FrameMsg } from '../src/stats'

/** A standing figure (nose at y=0.1, ankles at y=0.9 → body height 0.8) with optional per-frame noise. */
const frame = (t: number, noise = 0, seed = 0): FrameMsg => {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, v: 0.95 }))
  const n = (k: number) => noise * Math.sin(seed * 7.3 + k * 1.7) // deterministic "noise" of amplitude `noise`
  lm[J.nose] = { x: 0.5, y: 0.1, z: 0, v: 0.99 }
  lm[J.lAnkle] = lm[J.rAnkle] = { x: 0.5, y: 0.9, z: 0, v: 0.9 }
  lm[J.lShoulder] = { x: 0.45 + n(1), y: 0.3 + n(2), z: 0, v: 0.9 }; lm[J.rShoulder] = { x: 0.55 + n(3), y: 0.3 + n(4), z: 0, v: 0.9 }
  lm[J.lHip] = { x: 0.46 + n(5), y: 0.55 + n(6), z: 0, v: 0.8 }; lm[J.rHip] = { x: 0.54 + n(7), y: 0.55 + n(8), z: 0, v: 0.8 }
  lm[J.lKnee] = { x: 0.47 + n(9), y: 0.72 + n(10), z: 0, v: 0.7 }; lm[J.rKnee] = { x: 0.53 + n(11), y: 0.72 + n(12), z: 0, v: 0.7 }
  return { t, lm }
}
describe('stats', () => {
  it('stddev / percentile basics', () => {
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3)
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10); expect(percentile([5, 1, 3], 50)).toBe(3); expect(percentile([], 95)).toBe(0)
  })
  it('jitter is 0 for a perfectly still figure and scales with noise, in % of body height', () => {
    const still = Array.from({ length: 90 }, (_, i) => frame(i * 33))
    const j = jitter(still)
    expect(j.n).toBe(90); expect(j.seconds).toBeCloseTo(2.937, 2); expect(j.bodyHeight).toBeCloseTo(0.8, 6)
    expect(j.meanPct).toBeCloseTo(0, 6); expect(j.joints.map((x) => x.joint)).toEqual(['shoulder', 'hip', 'knee']); expect(j.joints[1]!.meanV).toBeCloseTo(0.8, 6)
    const noisy = Array.from({ length: 90 }, (_, i) => frame(i * 33, 0.004, i))
    const jn = jitter(noisy)
    expect(jn.meanPct).toBeGreaterThan(0.2); expect(jn.meanPct).toBeLessThan(1) // 0.004 of image ≈ 0.5 % of a 0.8 body → radial ≈ 0.4–0.7 %
    expect(jn.worstPct).toBeGreaterThanOrEqual(jn.meanPct)
    expect(jitter([frame(0)]).joints).toEqual([])
  })
  it('gaps and fps from timestamps', () => {
    const fr = [0, 33, 66, 400, 433, 466, 1000].map((t) => ({ t }))
    expect(gaps(fr)).toEqual({ count: 2, longestMs: 534 }); expect(gaps(fr, 600)).toEqual({ count: 0, longestMs: 534 })
    expect(fpsOf([{ t: 0 }, { t: 1000 }, { t: 2000 }])).toBe(1); expect(fpsOf([{ t: 5 }])).toBe(0)
  })
  it('DelayMeter keeps a rolling window', () => {
    const m = new DelayMeter(3); m.push(10); m.push(20); m.push(30); m.push(40)
    expect(m.read()).toEqual({ mean: 30, p95: 40, n: 3 })
  })
  it('buildFixture rebases t to 0, rounds to 4 decimals, clamps v and carries the manual count', () => {
    const frames = [frame(1700000000000), frame(1700000000033), frame(1700000000066)]
    frames[1]!.lm[0] = { x: 0.123456789, y: 0.5, z: -0.33333333, v: 1.2 }
    const fx = buildFixture(frames, [1700000000050], { id: 'sts-test-a', path: 'webview', phone: { model: 'Test', os: 'android 15' }, notes: 'n' })
    expect(fx.schema).toBe('spot.fixture.v1'); expect(fx.frames.map((f) => f.t)).toEqual([0, 33, 66]); expect(fx.manualReps).toBe(1); expect(fx.manualRepAt).toEqual([50])
    expect(fx.frames[1]!.lm[0]).toEqual({ x: 0.1235, y: 0.5, z: -0.3333, v: 1 }); expect(fx.fps).toBeCloseTo(30.3, 1); expect(fx.recordedAt).toBe('2023-11-14T22:13:20.000Z')
    expect(fx.frames.every((f) => f.lm.length === 33)).toBe(true)
  })
})
