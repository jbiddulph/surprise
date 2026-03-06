import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'
import { getSupabaseServiceClient } from '../../utils/supabase'
import { debugError, debugErrorSummary, debugLog, debugStatusMessage, getRequestId } from '../../utils/debug'

export default defineEventHandler(async (event) => {
  const requestId = getRequestId(event)
  try {
    debugLog(event, requestId, 'start')
    const user = await requireAuthUser(event)
    debugLog(event, requestId, 'auth.ok', { userId: user.id })

    const account = await prisma.surpriseme_users.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        display_name: true,
        gender_identity: true,
        sexual_orientation: true,
        age_range: true,
        country: true
      }
    })
    debugLog(event, requestId, 'user.fetch.ok', { hasAccount: Boolean(account) })

    const profile = await prisma.surpriseme_profiles.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: 'asc' }
    })
    debugLog(event, requestId, 'profile.fetch.ok', { hasProfile: Boolean(profile) })

    if (!profile) {
      return { account, profile: null, prediction: null, request_id: requestId }
    }

    const prediction = await prisma.surpriseme_predictions.findFirst({
      where: { profile_id: profile.id },
      orderBy: { created_at: 'desc' }
    })

    let images: Array<{
      id: string
      image_url: string
      storage_path: string
      category?: string | null
      approval_status?: string | null
    }> = []

    try {
      images = await prisma.surpriseme_profile_images.findMany({
        where: { profile_id: profile.id },
        select: { id: true, image_url: true, storage_path: true, category: true, approval_status: true },
        orderBy: { created_at: 'asc' }
      })
      debugLog(event, requestId, 'images.fetch.full.ok', { count: images.length })
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase()
      const isMissingModerationColumns =
        error?.code === 'P2022' || (message.includes('column') && (message.includes('category') || message.includes('approval_status')))

      if (isMissingModerationColumns) {
        images = await prisma.surpriseme_profile_images.findMany({
          where: { profile_id: profile.id },
          select: { id: true, image_url: true, storage_path: true },
          orderBy: { created_at: 'asc' }
        })
        debugLog(event, requestId, 'images.fetch.fallback.ok', { count: images.length })
      } else {
        throw error
      }
    }

    let supabase: ReturnType<typeof getSupabaseServiceClient> | null = null
    try {
      supabase = getSupabaseServiceClient()
    } catch {
      supabase = null
    }

    const resolvedImages = await Promise.all(
      images.map(async (image) => {
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
          approval_status: image.approval_status ?? 'approved'
        }
      })
    )

    return { account, profile, prediction, images: resolvedImages, request_id: requestId }
  } catch (error: any) {
    debugError(event, requestId, 'failed', error)
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: debugStatusMessage(event, requestId, `Failed to load profile: ${debugErrorSummary(error)}`)
    })
  }
})
