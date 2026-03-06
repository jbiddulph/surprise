import { prisma } from '../../../utils/prisma'
import { getSupabaseServiceClient } from '../../../utils/supabase'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing profile id' })
  }

  let profile: {
    id: string
    bio: string | null
    body_type: string | null
    fitness_level: string | null
    height_range: string | null
    hair_colour: string | null
    eye_colour: string | null
    user: { display_name: string }
    images: Array<{ id: string; image_url: string; storage_path: string; category?: string | null }>
  } | null = null

  try {
    profile = await prisma.surpriseme_profiles.findFirst({
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
          where: { approval_status: 'approved' },
          select: { id: true, image_url: true, storage_path: true, category: true },
          orderBy: { created_at: 'asc' }
        }
      }
    })
  } catch (error: any) {
    const message = String(error?.message || '').toLowerCase()
    const isMissingModerationColumns =
      error?.code === 'P2022' ||
      (message.includes('unknown arg') && (message.includes('category') || message.includes('approval_status'))) ||
      (message.includes('unknown field') && (message.includes('category') || message.includes('approval_status'))) ||
      (message.includes('column') && (message.includes('category') || message.includes('approval_status')))

    if (!isMissingModerationColumns) throw error

    // Backward-compatible path for deployments with stale generated Prisma client or schema.
    profile = await prisma.surpriseme_profiles.findFirst({
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
          select: { id: true, image_url: true, storage_path: true },
          orderBy: { created_at: 'asc' }
        }
      }
    })
  }

  if (!profile) {
    throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
  }

  const imageIds = profile.images.map((image) => image.id)
  let grouped: Array<{ image_id: string; _avg: { rating: number | null }; _count: { _all: number } }> = []
  if (imageIds.length) {
    try {
      grouped = await prisma.surpriseme_image_ratings.groupBy({
        by: ['image_id'],
        where: { image_id: { in: imageIds } },
        _avg: { rating: true },
        _count: { _all: true }
      })
    } catch {
      grouped = []
    }
  }

  const statsByImageId = new Map(
    grouped.map((g) => [
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

  const images = await Promise.all(
    profile.images.map(async (image) => {
      let resolvedUrl = image.image_url
      if (supabase) {
        const { data, error } = await supabase.storage.from('surpriseme_profiles').createSignedUrl(image.storage_path, 3600)
        if (!error && data?.signedUrl) {
          resolvedUrl = data.signedUrl
        }
      }

      return {
        id: image.id,
        image_url: resolvedUrl,
        category: image.category ?? 'Body (torso)',
        avg_rating: statsByImageId.get(image.id)?.avg_rating ?? null,
        rating_count: statsByImageId.get(image.id)?.rating_count ?? 0
      }
    })
  )

  return {
    ...profile,
    images
  }
})
