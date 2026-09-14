import { z } from 'zod'
export const ExerciseId = z.enum(['sit_to_stand', 'heel_raise', 'arm_raise', 'knee_straighten', 'supported_squat'])
export const Camera = z.enum(['side', 'front'])
export const ExerciseSpec = z.object({ id: ExerciseId, sets: z.number().int().min(1).max(3), reps: z.number().int().min(4).max(20), restS: z.number().int(), camera: Camera })
export const Plan = z.object({ programmeSlug: z.string(), minutes: z.number(), exercises: z.array(ExerciseSpec).min(1).max(3) })
export const Landmark = z.object({ x: z.number(), y: z.number(), z: z.number().optional(), v: z.number().min(0).max(1) })
/** One frame from the phone: 33 MediaPipe landmarks, normalized [0,1], plus timestamp. ~4 KB. Never pixels. */
export const Frame = z.object({ t: z.number(), lm: z.array(Landmark).length(33) })
export const Framing = z.object({ head: z.boolean(), hips: z.boolean(), feet: z.boolean(), light: z.enum(['ok', 'dark']) })
export const SetResultDto = z.object({ exerciseId: ExerciseId, setIndex: z.number().int(), reps: z.number().int(), targetReps: z.number().int(), peakRange: z.number(), avgRepS: z.number(), cues: z.array(z.string()) })
export const PersonDto = z.object({ name: z.string().nullable(), textScale: z.enum(['large', 'larger']), voiceOn: z.boolean(), sessionMinutes: z.union([z.literal(8), z.literal(12), z.literal(16)]), restS: z.number().int(), firstRunDone: z.boolean(), programmeSlug: z.string().nullable() })
export const Events = { frame: 'frame', framing: 'framing', battery: 'phone:battery', exercise: 'tv:exercise', connected: 'phone:connected' } as const
export type Plan = z.infer<typeof Plan>; export type ExerciseSpec = z.infer<typeof ExerciseSpec>; export type Frame = z.infer<typeof Frame>; export type Framing = z.infer<typeof Framing>; export type SetResultDto = z.infer<typeof SetResultDto>; export type PersonDto = z.infer<typeof PersonDto>; export type ExerciseId = z.infer<typeof ExerciseId>
