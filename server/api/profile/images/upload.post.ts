import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '../../../utils/prisma'
import { requireAuthUser } from '../../../utils/auth'
import { getSupabaseServiceClient } from '../../../utils/supabase'

const schema = z.object({
  profile_id: z.string().uuid().optional(),
  filename: z.string().min(1).max(120),
  content_type: z.string().min(3).max(80),
  base64: z.string().min(1),
  category: z.enum(['Boobs', 'Bum', 'Legs', 'Hands', 'Feet', 'Face', 'Hair', 'Body (torso)']).default('Body (torso)')
})

function extensionFromType(contentType: string) {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  return 'jpg'
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = schema.parse(await readBody(event))

  const profile = body.profile_id
    ? await prisma.surpriseme_profiles.findUnique({ where: { id: body.profile_id } })
    : await prisma.surpriseme_profiles.findFirst({ where: { user_id: user.id }, orderBy: { created_at: 'asc' } })

  if (!profile) {
    throw createError({ statusCode: 400, statusMessage: 'Create your profile before uploading images' })
  }

  if (profile.user_id !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'You can only upload images to your own profile' })
  }

  const imageId = randomUUID()
  const ext = extensionFromType(body.content_type)
  const storagePath = `profiles/${user.id}/${imageId}.${ext}`
  const bytes = Buffer.from(body.base64, 'base64')

  const supabase = getSupabaseServiceClient()
  const { error: uploadError } = await supabase.storage
    .from('surpriseme_profiles')
    .upload(storagePath, bytes, { contentType: body.content_type, upsert: false })

  if (uploadError) {
    throw createError({ statusCode: 500, statusMessage: uploadError.message })
  }

  const { data: publicData } = supabase.storage.from('surpriseme_profiles').getPublicUrl(storagePath)

  let image: any
  try {
    image = await prisma.surpriseme_profile_images.create({
      data: {
        profile_id: profile.id,
        image_url: publicData.publicUrl,
        storage_path: storagePath,
        category: body.category,
        approval_status: 'pending'
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

    image = await prisma.surpriseme_profile_images.create({
      data: {
        profile_id: profile.id,
        image_url: publicData.publicUrl,
        storage_path: storagePath
      }
    })
  }

  return { image }
})
