import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing profile id' })
  }

  const profile = await prisma.surpriseme_profiles.findFirst({
    where: { id, is_public: true },
    select: {
      id: true,
      bio: true,
      body_type: true,
      fitness_level: true,
      height_range: true,
      hair_colour: true,
      eye_colour: true,
      user: { select: { display_name: true } },
      images: {
        select: { id: true, image_url: true },
        orderBy: { created_at: 'asc' }
      }
    }
  })

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  }

  return profile
})
