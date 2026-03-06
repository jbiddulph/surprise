import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'
import { sanitizeComment } from '../../utils/moderation'

const schema = z.object({
  profile_id: z.string().uuid(),
  attractiveness_rating: z.enum(['Very attractive', 'Attractive', 'Average', 'Below average']),
  body_type_perception: z.string().min(2).max(40),
  confidence_perception: z.enum(['Very confident', 'Confident', 'Neutral', 'Slightly shy']),
  approachability: z.enum(['Very approachable', 'Friendly', 'Neutral', 'Intimidating']),
  comment: z.string().max(280).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = schema.parse(await readBody(event))

  const profile = await prisma.surpriseme_profiles.findUnique({ where: { id: body.profile_id } })
  if (!profile || !profile.is_public) {
    throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  }

  if (profile.user_id === user.id) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot submit feedback on your own profile' })
  }

  const comment = body.comment ? sanitizeComment(body.comment) : null

  const submission = await prisma.surpriseme_questionnaires.upsert({
    where: { profile_id_contributor_id: { profile_id: body.profile_id, contributor_id: user.id } },
    create: {
      profile_id: body.profile_id,
      contributor_id: user.id,
      attractiveness_rating: body.attractiveness_rating,
      body_type_perception: body.body_type_perception,
      confidence_perception: body.confidence_perception,
      approachability: body.approachability,
      comment
    },
    update: {
      attractiveness_rating: body.attractiveness_rating,
      body_type_perception: body.body_type_perception,
      confidence_perception: body.confidence_perception,
      approachability: body.approachability,
      comment
    }
  })

  return { submission_id: submission.id }
})
