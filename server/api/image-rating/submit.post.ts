import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'

const schema = z.object({
  profile_id: z.string().uuid(),
  image_id: z.string().uuid(),
  rating: z.number().int().min(1).max(10)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = schema.parse(await readBody(event))

  const profile = await prisma.surpriseme_profiles.findUnique({ where: { id: body.profile_id } })
  if (!profile || !profile.is_public) {
    throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  }

  if (profile.user_id === user.id) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot rate your own profile images' })
  }

  const image = await prisma.surpriseme_profile_images.findUnique({ where: { id: body.image_id } })
  if (!image || image.profile_id !== body.profile_id) {
    throw createError({ statusCode: 400, statusMessage: 'Image does not belong to profile' })
  }

  const vote = await prisma.surpriseme_image_ratings.upsert({
    where: {
      image_id_contributor_id: {
        image_id: body.image_id,
        contributor_id: user.id
      }
    },
    create: {
      image_id: body.image_id,
      profile_id: body.profile_id,
      contributor_id: user.id,
      rating: body.rating
    },
    update: {
      rating: body.rating
    }
  })

  return { vote_id: vote.id, rating: vote.rating }
})
