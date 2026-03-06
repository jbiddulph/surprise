import { z } from 'zod'
import { prisma } from '../../../utils/prisma'
import { requireAdminUser } from '../../../utils/auth'

const schema = z.object({
  image_id: z.string().uuid(),
  action: z.enum(['approve', 'reject'])
})

export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const body = schema.parse(await readBody(event))

  const image = await prisma.surpriseme_profile_images.findUnique({ where: { id: body.image_id } })
  if (!image) {
    throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  }

  const updated = await prisma.surpriseme_profile_images.update({
    where: { id: body.image_id },
    data: {
      approval_status: body.action === 'approve' ? 'approved' : 'rejected',
      approved_by: admin.id,
      approved_at: new Date()
    }
  })

  return { image_id: updated.id, approval_status: updated.approval_status }
})
