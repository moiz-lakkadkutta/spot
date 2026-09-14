import type { Frame, Framing } from '@spot/contracts'
import { LM } from './landmarks'
/** Whole body visible? Head (nose), hips, feet (heels/foot index) with visibility ≥ 0.6 and inside the frame with 5 % margin. */
export function checkFraming(f: Frame, light: 'ok' | 'dark' = 'ok'): Framing {
  const inFrame = (i: number) => { const p = f.lm[i]!; return p.v >= 0.6 && p.x > 0.05 && p.x < 0.95 && p.y > 0.05 && p.y < 0.95 }
  return { head: inFrame(LM.nose), hips: inFrame(LM.lHip) || inFrame(LM.rHip), feet: (inFrame(LM.lHeel) || inFrame(LM.lFoot)) && (inFrame(LM.rHeel) || inFrame(LM.rFoot)), light }
}
