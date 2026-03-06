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

    let updated: { id: string; approval_status?: string | null }
    try {
      updated = await prisma.surpriseme_profile_images.update({
        where: { id: body.image_id },
        data: {
          approval_status: body.action === 'approve' ? 'approved' : 'rejected',
          approved_by: admin.id,
          approved_at: new Date()
        }
      })
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase()
      const isMissingModerationColumns =
        error?.code === 'P2022' ||
        (message.includes('unknown arg') &&
          (message.includes('approval_status') || message.includes('approved_by') || message.includes('approved_at'))) ||
        (message.includes('unknown field') &&
          (message.includes('approval_status') || message.includes('approved_by') || message.includes('approved_at'))) ||
        (message.includes('column') &&
          (message.includes('approval_status') || message.includes('approved_by') || message.includes('approved_at')))

      if (!isMissingModerationColumns) throw error

      throw createError({
        statusCode: 500,
        statusMessage: debugStatusMessage(
          event,
          requestId,
          'Image moderation columns are missing in current deployment. Run latest migrations and redeploy.'
        )
      })
    }

    debugLog(event, requestId, 'image.review.ok', { imageId: updated.id, approvalStatus: updated.approval_status ?? null })
    return { image_id: updated.id, approval_status: updated.approval_status ?? null, request_id: requestId }
  } catch (error: any) {
    debugError(event, requestId, 'failed', error)
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: debugStatusMessage(event, requestId, `Failed to review image: ${debugErrorSummary(error)}`)
    })
  }
})
