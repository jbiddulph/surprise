import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'
import { getSupabaseServiceClient } from '../../utils/supabase'
import { debugError, debugErrorSummary, debugLog, debugStatusMessage, getRequestId } from '../../utils/debug'

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
  const requestId = getRequestId(event)
  try {
    debugLog(event, requestId, 'start')
    const user = await requireAuthUser(event)
    debugLog(event, requestId, 'auth.ok', { userId: user.id })

    const body = await readBody<{ profile_id?: string }>(event)
    const requestedProfileId = body?.profile_id

    const profile = requestedProfileId
      ? await prisma.surpriseme_profiles.findUnique({ where: { id: requestedProfileId } })
      : await prisma.surpriseme_profiles.findFirst({ where: { user_id: user.id }, orderBy: { created_at: 'asc' } })

    if (!profile || profile.user_id !== user.id) {
      throw createError({ statusCode: 403, statusMessage: 'You can only view your own result dashboard' })
    }
    debugLog(event, requestId, 'profile.ok', { profileId: profile.id })

    // Avoid relying on DB auth context-dependent RPC (auth.uid) from Prisma calls.
    const [predictionRow, commentsRows, attractivenessRows, bodyRows, confidenceRows, approachabilityRows, images] = await Promise.all([
      prisma.surpriseme_predictions.findFirst({
        where: { profile_id: profile.id },
        orderBy: { created_at: 'desc' }
      }),
      prisma.surpriseme_questionnaires.findMany({
        where: { profile_id: profile.id, comment: { not: null } },
        select: { comment: true }
      }),
      prisma.surpriseme_questionnaires.groupBy({
        by: ['attractiveness_rating'],
        where: { profile_id: profile.id },
        _count: { _all: true }
      }),
      prisma.surpriseme_questionnaires.groupBy({
        by: ['body_type_perception'],
        where: { profile_id: profile.id },
        _count: { _all: true }
      }),
      prisma.surpriseme_questionnaires.groupBy({
        by: ['confidence_perception'],
        where: { profile_id: profile.id },
        _count: { _all: true }
      }),
      prisma.surpriseme_questionnaires.groupBy({
        by: ['approachability'],
        where: { profile_id: profile.id },
        _count: { _all: true }
      }),
      prisma.surpriseme_profile_images.findMany({
        where: { profile_id: profile.id },
        select: { id: true, image_url: true, storage_path: true },
        orderBy: { created_at: 'asc' }
      })
    ])

    const toCountMap = <T extends string>(rows: Array<{ _count: { _all: number } } & Record<string, T>>, key: string) => {
      const map: AggregateMap = {}
      for (const row of rows) {
        const label = String((row as any)[key] ?? '')
        if (!label) continue
        map[label] = row._count._all
      }
      return map
    }

    const aggregates = {
      attractiveness: toCountMap(attractivenessRows as any, 'attractiveness_rating'),
      body_type_perception: toCountMap(bodyRows as any, 'body_type_perception'),
      confidence_perception: toCountMap(confidenceRows as any, 'confidence_perception'),
      approachability: toCountMap(approachabilityRows as any, 'approachability')
    }

    const prediction = predictionRow
      ? {
          predicted_attractiveness: predictionRow.predicted_attractiveness,
          predicted_confidence: predictionRow.predicted_confidence,
          predicted_body_type: predictionRow.predicted_body_type,
          created_at: predictionRow.created_at
        }
      : {}
    const comments = commentsRows.map((r) => r.comment).filter((c): c is string => Boolean(c?.trim()))
    debugLog(event, requestId, 'aggregates.ok', {
      comments: comments.length,
      images: images.length
    })

    const imageIds = images.map((img) => img.id)
    let groupedImageRatings: Array<{ image_id: string; _avg: { rating: number | null }; _count: { _all: number } }> = []
    if (imageIds.length) {
      try {
        groupedImageRatings = await prisma.surpriseme_image_ratings.groupBy({
          by: ['image_id'],
          where: { profile_id: profile.id, image_id: { in: imageIds } },
          _avg: { rating: true },
          _count: { _all: true }
        })
      } catch {
        groupedImageRatings = []
      }
    }

    const ratingsByImageId = new Map(
      groupedImageRatings.map((g) => [
        g.image_id,
        {
          avg_rating: Number((g._avg.rating ?? 0).toFixed(2)),
          rating_count: g._count._all
        }
      ])
    )

    let supabase: ReturnType<typeof getSupabaseServiceClient> | null = null
    try {
      supabase = getSupabaseServiceClient()
    } catch {
      supabase = null
    }

    const imageRatings = await Promise.all(
      images.map(async (image) => {
        let resolvedUrl = image.image_url
        if (supabase) {
          const { data, error } = await supabase.storage.from('surpriseme_profiles').createSignedUrl(image.storage_path, 3600)
          if (!error && data?.signedUrl) {
            resolvedUrl = data.signedUrl
          }
        }

        return {
          image_id: image.id,
          image_url: resolvedUrl,
          avg_rating: ratingsByImageId.get(image.id)?.avg_rating ?? null,
          rating_count: ratingsByImageId.get(image.id)?.rating_count ?? 0
        }
      })
    )

    return {
      profile_id: profile.id,
      aggregates,
      comments,
      prediction,
      expectation_vs_reality: {
        attractiveness: {
          expected: (prediction as any).predicted_attractiveness ?? null,
          actual: topLabel(aggregates.attractiveness)
        },
        confidence: {
          expected: (prediction as any).predicted_confidence ?? null,
          actual: topLabel(aggregates.confidence_perception)
        },
        body_type: {
          expected: (prediction as any).predicted_body_type ?? null,
          actual: topLabel(aggregates.body_type_perception)
        }
      },
      image_ratings: imageRatings,
      confidence_boost_summary: createSummary(aggregates, prediction as any),
      request_id: requestId
    }
  } catch (error: any) {
    debugError(event, requestId, 'failed', error)
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: debugStatusMessage(event, requestId, `Failed to load results: ${debugErrorSummary(error)}`)
    })
  }
})
