import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const P = [
  { slug: 'mobility-basics', name: 'Mobility basics', description: 'Three gentle movements for everyday mobility. About 12 minutes.', exercises: [{ id: 'sit_to_stand', sets: 2, reps: 8, restS: 30, camera: 'side' }, { id: 'heel_raise', sets: 2, reps: 10, restS: 30, camera: 'side' }, { id: 'arm_raise', sets: 2, reps: 10, restS: 30, camera: 'front' }] },
  { slug: 'steadier-on-your-feet', name: 'Steadier on your feet', description: 'Balance and leg strength with a chair for support.', exercises: [{ id: 'sit_to_stand', sets: 2, reps: 10, restS: 30, camera: 'side' }, { id: 'heel_raise', sets: 3, reps: 10, restS: 30, camera: 'side' }, { id: 'supported_squat', sets: 2, reps: 6, restS: 45, camera: 'side' }] },
  { slug: 'sit-stand-strength', name: 'Sit-stand strength', description: 'For getting up from chairs and the sofa with less effort.', exercises: [{ id: 'sit_to_stand', sets: 3, reps: 8, restS: 30, camera: 'side' }, { id: 'knee_straighten', sets: 2, reps: 10, restS: 30, camera: 'side' }, { id: 'arm_raise', sets: 1, reps: 10, restS: 30, camera: 'front' }] },
]
for (const p of P) await db.programme.upsert({ where: { slug: p.slug }, create: p, update: p })
console.log('seeded programmes')
