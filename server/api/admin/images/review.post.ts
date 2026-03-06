import { z } from 'zod'
import { prisma } from '../../../utils/prisma'
import { requireAdminUser } from '../../../utils/auth'
import { debugError, debugErrorSummary, debugLog, debugStatusMessage, getRequestId } from '../../../utils/debug'

const schema = z.object({
  image_id: z.string().uuid(),
  action: z.enum(['approve', 'reject'])
})

export default defineEventHandler(async (event) => {
  const requestId = getRequestId(event)
  try {
    debugLog(event, requestId, 'start')
    const admin = await requireAdminUser(event)
    debugLog(event, requestId, 'admin.auth.ok', { userId: admin.id })
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

    debugLog(event, requestId, 'image.review.ok', { imageId: updated.id, approvalStatus: updated.approval_status })
    return { image_id: updated.id, approval_status: updated.approval_status, request_id: requestId }
  } catch (error: any) {
    debugError(event, requestId, 'failed', error)
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: debugStatusMessage(event, requestId, `Failed to review image: ${debugErrorSummary(error)}`)
    })
  }
})
