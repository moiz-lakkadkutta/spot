import type { Server } from 'socket.io'
import { Frame } from '@spot/contracts'
/**
 * Rooms are pairing codes. Phone emits `frame` (33 landmarks, ≤ 15 fps) and `framing`; TV emits `tv:exercise` (camera side).
 * Frames are relayed only — all pose math runs on the TV (packages/heuristics). Nothing is stored.
 */
export function registerSockets(io: Server) {
  io.on('connection', (s) => {
    s.on('join', ({ code, role }: { code: string; role: 'tv' | 'phone' }) => { s.join(code); if (role === 'phone') io.to(code).emit('phone:connected', { code }) })
    s.on('frame', ({ code, frame }: { code: string; frame: unknown }) => { if (Frame.safeParse(frame).success) s.to(code).volatile.emit('frame', frame) })
    s.on('framing', ({ code, framing }: { code: string; framing: unknown }) => s.to(code).emit('framing', framing))
    s.on('phone:battery', ({ code, pct }: { code: string; pct: number }) => s.to(code).emit('phone:battery', pct))
    s.on('tv:exercise', ({ code, camera }: { code: string; camera: 'side' | 'front' }) => s.to(code).emit('tv:exercise', camera))
  })
}
