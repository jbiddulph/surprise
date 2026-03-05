import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const profiles = await prisma.surpriseme_profiles.findMany({
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      bio: true,
      body_type: true,
      fitness_level: true,
      user: { select: { display_name: true } }
    }
  })

  return profiles
})
