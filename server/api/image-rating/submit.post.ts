import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { optionalAuthUser } from '../../utils/auth'

const schema = z.object({
  profile_id: z.string().uuid(),
  image_id: z.string().uuid(),
  rating: z.number().int().min(0).max(10),
  visitor_token: z.string().min(16).max(120).optional()
})

export default defineEventHandler(async (event) => {
  const user = await optionalAuthUser(event)
  const body = schema.parse(await readBody(event))

  const profile = await prisma.surpriseme_profiles.findUnique({ where: { id: body.profile_id } })
  if (!profile || !profile.is_public) {
    throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  }

  if (user?.id && profile.user_id === user.id) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot rate your own profile images' })
  }

  let image: { id: string; profile_id: string; approval_status?: string | null } | null = null
  try {
    image = await prisma.surpriseme_profile_images.findUnique({
      where: { id: body.image_id },
      select: { id: true, profile_id: true, approval_status: true }
    })
  } catch (error: any) {
    const message = String(error?.message || '').toLowerCase()
    const isMissingApprovalColumn =
      error?.code === 'P2022' ||
      (message.includes('unknown arg') && message.includes('approval_status')) ||
      (message.includes('unknown field') && message.includes('approval_status')) ||
      (message.includes('column') && message.includes('approval_status'))

    if (!isMissingApprovalColumn) throw error

    image = await prisma.surpriseme_profile_images.findUnique({
      where: { id: body.image_id },
      select: { id: true, profile_id: true }
    })
  }

  if (!image || image.profile_id !== body.profile_id) {
    throw createError({ statusCode: 400, statusMessage: 'Image does not belong to profile' })
  }
  if (typeof image.approval_status === 'string' && image.approval_status !== 'approved') {
    throw createError({ statusCode: 400, statusMessage: 'Image is not approved for rating' })
  }

  const actorVisitorToken = user ? null : body.visitor_token
  if (!user && !actorVisitorToken) {
    throw createError({ statusCode: 400, statusMessage: 'visitor_token is required for guest rating' })
  }

  const vote = user
    ? await prisma.surpriseme_image_ratings.upsert({
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
          visitor_token: null,
          rating: body.rating
        },
        update: { rating: body.rating }
      })
    : await prisma.surpriseme_image_ratings.upsert({
        where: {
          image_id_visitor_token: {
            image_id: body.image_id,
            visitor_token: actorVisitorToken as string
          }
        },
        create: {
          image_id: body.image_id,
          profile_id: body.profile_id,
          contributor_id: null,
          visitor_token: actorVisitorToken as string,
          rating: body.rating
        },
        update: { rating: body.rating }
      })

  return { vote_id: vote.id, rating: vote.rating }
})
