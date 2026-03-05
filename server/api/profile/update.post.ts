import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'

const schema = z.object({
  profile_id: z.string().uuid(),
  bio: z.string().max(500).optional(),
  height_range: z.string().max(40).optional(),
  body_type: z.string().max(40).optional(),
  fitness_level: z.string().max(40).optional(),
  hair_colour: z.string().max(40).optional(),
  eye_colour: z.string().max(40).optional(),
  ethnicity: z.string().max(80).optional(),
  is_public: z.boolean().optional(),
  predictions: z
    .object({
      predicted_attractiveness: z.string().max(40).optional(),
      predicted_confidence: z.string().max(40).optional(),
      predicted_body_type: z.string().max(40).optional()
    })
    .optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = schema.parse(await readBody(event))

  const existing = await prisma.surpriseme_profiles.findUnique({ where: { id: body.profile_id } })
  if (!existing || existing.user_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only update your own profile' })
  }

  const profile = await prisma.surpriseme_profiles.update({
    where: { id: body.profile_id },
    data: {
      bio: body.bio,
      height_range: body.height_range,
      body_type: body.body_type,
      fitness_level: body.fitness_level,
      hair_colour: body.hair_colour,
      eye_colour: body.eye_colour,
      ethnicity: body.ethnicity,
      is_public: body.is_public
    }
  })

  if (body.predictions) {
    await prisma.surpriseme_predictions.create({
      data: {
        profile_id: body.profile_id,
        predicted_attractiveness: body.predictions.predicted_attractiveness,
        predicted_confidence: body.predictions.predicted_confidence,
        predicted_body_type: body.predictions.predicted_body_type
      }
    })
  }

  return { profile }
})
