/** MediaPipe Pose Landmarker indices. */
export const LM = { nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28, lHeel: 29, rHeel: 30, lFoot: 31, rFoot: 32 } as const
export interface Pt { x: number; y: number; z?: number; v: number }
export type Frame = { t: number; lm: Pt[] }
/** Angle at b between a–b and c–b, degrees (2D, camera plane). */
export function angle(a: Pt, b: Pt, c: Pt): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y }
  const dot = v1.x * v2.x + v1.y * v2.y, m = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)
  return m === 0 ? 0 : (Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180) / Math.PI
}
/** Angle of segment a→b from vertical (0 = straight up/down), degrees. */
export function fromVertical(a: Pt, b: Pt): number { return (Math.atan2(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 180) / Math.PI }
export const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) })
export function visible(f: Frame, idx: number[], min = 0.6): boolean { return idx.every((i) => (f.lm[i]?.v ?? 0) >= min) }
/** Body height proxy: nose to ankle midpoint (normalized units). */
export function bodyHeight(f: Frame): number { return Math.abs(mid(f.lm[LM.lAnkle]!, f.lm[LM.rAnkle]!).y - f.lm[LM.nose]!.y) }
/** 5-frame running median for a scalar series. */
export class Median5 { private buf: number[] = []; push(v: number): number { this.buf.push(v); if (this.buf.length > 5) this.buf.shift(); const s = [...this.buf].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]! } reset() { this.buf = [] } }
