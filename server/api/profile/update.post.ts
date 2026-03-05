import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'
import { debugError, debugLog, debugStatusMessage, getRequestId } from '../../utils/debug'

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
  const requestId = getRequestId(event)

  try {
    debugLog(event, requestId, 'start')
    const user = await requireAuthUser(event)
    debugLog(event, requestId, 'auth.ok', { userId: user.id })

    const rawBody = await readBody(event)
    const parsed = schema.safeParse(rawBody)
    if (!parsed.success) {
      debugLog(event, requestId, 'validation.failed', {
        issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      })
      throw createError({
        statusCode: 400,
        statusMessage: debugStatusMessage(event, requestId, 'Invalid update payload')
      })
    }
    const body = parsed.data

    const existing = await prisma.surpriseme_profiles.findUnique({ where: { id: body.profile_id } })
    if (!existing || existing.user_id !== user.id) {
      throw createError({ statusCode: 403, statusMessage: 'You can only update your own profile' })
    }
    debugLog(event, requestId, 'profile.lookup.ok', { profileId: body.profile_id })

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
    debugLog(event, requestId, 'profile.update.ok')

    if (body.predictions) {
      await prisma.surpriseme_predictions.create({
        data: {
          profile_id: body.profile_id,
          predicted_attractiveness: body.predictions.predicted_attractiveness,
          predicted_confidence: body.predictions.predicted_confidence,
          predicted_body_type: body.predictions.predicted_body_type
        }
      })
      debugLog(event, requestId, 'prediction.create.ok')
    }

    return { profile, request_id: requestId }
  } catch (error: any) {
    debugError(event, requestId, 'failed', error)
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: debugStatusMessage(event, requestId, 'Failed to update profile')
    })
  }
})
