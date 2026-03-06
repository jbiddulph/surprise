import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'
import { getSupabaseServiceClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)

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

  const profile = await prisma.surpriseme_profiles.findFirst({
    where: { user_id: user.id },
    orderBy: { created_at: 'asc' }
  })

  if (!profile) {
    return { account, profile: null, prediction: null }
  }

  const prediction = await prisma.surpriseme_predictions.findFirst({
    where: { profile_id: profile.id },
    orderBy: { created_at: 'desc' }
  })

  const images = await prisma.surpriseme_profile_images.findMany({
    where: { profile_id: profile.id },
    select: { id: true, image_url: true, storage_path: true, category: true, approval_status: true },
    orderBy: { created_at: 'asc' }
  })

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
        category: image.category,
        approval_status: image.approval_status
      }
    })
  )

  return { account, profile, prediction, images: resolvedImages }
})
