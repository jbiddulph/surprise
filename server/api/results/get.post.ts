import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'

type AggregateMap = Record<string, number>

function topLabel(map: AggregateMap | undefined) {
  if (!map) return null
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function createSummary(aggregates: Record<string, AggregateMap>, prediction: Record<string, string>) {
  const topAttractiveness = topLabel(aggregates.attractiveness)
  const topConfidence = topLabel(aggregates.confidence_perception)
  const topApproachability = topLabel(aggregates.approachability)

  const lines = [
    topConfidence
      ? `Most contributors described you as ${topConfidence.toLowerCase()}.`
      : 'Contributors shared positive first impressions.',
    topApproachability
      ? `You were often seen as ${topApproachability.toLowerCase()}.`
      : 'You were seen as approachable and positive.',
    topAttractiveness
      ? `Your most common attractiveness rating was ${topAttractiveness.toLowerCase()}.`
      : 'Many contributors gave encouraging appearance feedback.'
  ]

  if (prediction.predicted_attractiveness && topAttractiveness && prediction.predicted_attractiveness !== topAttractiveness) {
    lines.push('Your self-assessment appears more modest than community feedback.')
  }

  return lines.join(' ')
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody<{ profile_id?: string }>(event)
  const requestedProfileId = body?.profile_id

  const profile = requestedProfileId
    ? await prisma.surpriseme_profiles.findUnique({ where: { id: requestedProfileId } })
    : await prisma.surpriseme_profiles.findFirst({ where: { user_id: user.id }, orderBy: { created_at: 'asc' } })

  if (!profile || profile.user_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only view your own result dashboard' })
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ payload: any }>>(
    'select public.surpriseme_get_profile_results($1::uuid) as payload',
    profile.id
  )

  const payload = rows[0]?.payload ?? {}
  const aggregates = payload.aggregates ?? {}
  const prediction = payload.prediction ?? {}

  return {
    ...payload,
    expectation_vs_reality: {
      attractiveness: {
        expected: prediction.predicted_attractiveness ?? null,
        actual: topLabel(aggregates.attractiveness)
      },
      confidence: {
        expected: prediction.predicted_confidence ?? null,
        actual: topLabel(aggregates.confidence_perception)
      },
      body_type: {
        expected: prediction.predicted_body_type ?? null,
        actual: topLabel(aggregates.body_type_perception)
      }
    },
    confidence_boost_summary: createSummary(aggregates, prediction)
  }
})
