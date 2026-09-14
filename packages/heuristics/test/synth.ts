/** Synthetic landmark generator: a side-view stick figure doing sit-to-stand with a given hip angle series. Real fixtures replace this in SPOT-001. */
import type { Frame } from '@spot/contracts'
const blank = (): Frame['lm'] => Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, v: 0.95 }))
/** Build a frame with shoulder–hip–knee angle `hipDeg` (side view, hip fixed at (0.5,0.5), thigh horizontal-ish). */
export function sideFrame(t: number, hipDeg: number, opts: { kneeDeg?: number; leanDeg?: number; heelLift?: number } = {}): Frame {
  const lm = blank()
  const hip = { x: 0.5, y: 0.5 }
  const thighLen = 0.15, torsoLen = 0.22, shinLen = 0.15
  // knee: thigh points forward-down; angle between torso (up) and thigh = hipDeg
  const thighAngle = Math.PI / 2 + ((180 - hipDeg) * Math.PI) / 180 // 180° hip → thigh straight down
  const knee = { x: hip.x + Math.cos(thighAngle) * thighLen, y: hip.y + Math.sin(thighAngle) * thighLen }
  const lean = ((opts.leanDeg ?? 0) * Math.PI) / 180
  const shoulder = { x: hip.x + Math.sin(lean) * torsoLen, y: hip.y - Math.cos(lean) * torsoLen }
  const kneeDeg = opts.kneeDeg ?? (hipDeg > 150 ? 175 : 90)
  const shinAngle = thighAngle + ((180 - kneeDeg) * Math.PI) / 180
  const ankle = { x: knee.x + Math.cos(shinAngle) * shinLen, y: knee.y + Math.sin(shinAngle) * shinLen }
  const heelY = ankle.y + 0.03 - (opts.heelLift ?? 0)
  for (const [i, p] of [[11, shoulder], [12, shoulder], [23, hip], [24, hip], [25, knee], [26, knee], [27, ankle], [28, ankle]] as Array<[number, { x: number; y: number }]>) lm[i] = { ...p, v: 0.95 }
  lm[0] = { x: shoulder.x, y: shoulder.y - 0.12, v: 0.95 }
  lm[29] = lm[30] = { x: ankle.x - 0.02, y: heelY, v: 0.95 }
  lm[31] = lm[32] = { x: ankle.x + 0.06, y: ankle.y + 0.03, v: 0.95 }
  lm[13] = lm[14] = { x: shoulder.x, y: shoulder.y + 0.12, v: 0.95 }
  lm[15] = lm[16] = { x: shoulder.x, y: shoulder.y + 0.24, v: 0.95 }
  return { t, lm }
}
/** Hip-angle series for N sit-to-stand reps at `repMs` each (seated 90° → standing 175° → seated). */
export function sitStandSeries(reps: number, repMs = 3000, fps = 15): Array<{ t: number; hip: number }> {
  const out: Array<{ t: number; hip: number }> = []
  const frames = Math.round((repMs / 1000) * fps)
  // 20 % seated hold, then a smooth stand-and-sit arc — the shape a real rep has.
  for (let r = 0; r < reps; r++) for (let k = 0; k < frames; k++) { const ph = k / frames; const hip = ph < 0.2 ? 90 : 90 + 85 * Math.sin((Math.PI * (ph - 0.2)) / 0.8); out.push({ t: r * repMs + (k * 1000) / fps, hip }) }
  return out
}
