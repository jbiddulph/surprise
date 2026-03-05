import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'

const bodySchema = z.object({
  display_name: z.string().min(2).max(80),
  gender_identity: z.string().max(80).optional(),
  sexual_orientation: z.string().max(80).optional(),
  age_range: z.string().max(40).optional(),
  country: z.string().max(80).optional(),
  bio: z.string().max(500).optional(),
  height_range: z.string().max(40).optional(),
  body_type: z.string().max(40).optional(),
  fitness_level: z.string().max(40).optional(),
  hair_colour: z.string().max(40).optional(),
  eye_colour: z.string().max(40).optional(),
  ethnicity: z.string().max(80).optional(),
  is_public: z.boolean().default(true),
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
  const body = bodySchema.parse(await readBody(event))

  await prisma.surpriseme_users.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email ?? `${user.id}@placeholder.local`,
      display_name: body.display_name,
      gender_identity: body.gender_identity,
      sexual_orientation: body.sexual_orientation,
      age_range: body.age_range,
      country: body.country
    },
    update: {
      email: user.email ?? `${user.id}@placeholder.local`,
      display_name: body.display_name,
      gender_identity: body.gender_identity,
      sexual_orientation: body.sexual_orientation,
      age_range: body.age_range,
      country: body.country
    }
  })

  const existingProfile = await prisma.surpriseme_profiles.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: 'asc' }
  })

  const profile = existingProfile
    ? await prisma.surpriseme_profiles.update({
        where: { id: existingProfile.id },
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
    : await prisma.surpriseme_profiles.create({
        data: {
          user_id: user.id,
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
        profile_id: profile.id,
        predicted_attractiveness: body.predictions.predicted_attractiveness,
        predicted_confidence: body.predictions.predicted_confidence,
        predicted_body_type: body.predictions.predicted_body_type
      }
    })
  }

  return { profile, mode: existingProfile ? 'updated' : 'created' }
})
