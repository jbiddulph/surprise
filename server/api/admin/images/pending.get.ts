import { prisma } from '../../../utils/prisma'
import { requireAdminUser } from '../../../utils/auth'
import { debugError, debugErrorSummary, debugLog, debugStatusMessage, getRequestId } from '../../../utils/debug'

export default defineEventHandler(async (event) => {
  const requestId = getRequestId(event)
  try {
    debugLog(event, requestId, 'start')
    await requireAdminUser(event)
    debugLog(event, requestId, 'admin.auth.ok')

    let pending: any[] = []
    try {
      pending = await prisma.surpriseme_profile_images.findMany({
        where: { approval_status: 'pending' },
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          image_url: true,
          storage_path: true,
          category: true,
          created_at: true,
          profile: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  display_name: true,
                  email: true
                }
              }
            }
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

      pending = await prisma.surpriseme_profile_images.findMany({
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          image_url: true,
          storage_path: true,
          created_at: true,
          profile: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  display_name: true,
                  email: true
                }
              }
            }
          }
        }
      })

      pending = pending.map((item) => ({ ...item, category: 'Body (torso)' }))
    }
    debugLog(event, requestId, 'pending.fetch.ok', { count: pending.length })

    return pending
  } catch (error: any) {
    debugError(event, requestId, 'failed', error)
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: debugStatusMessage(event, requestId, `Failed to load pending images: ${debugErrorSummary(error)}`)
    })
  }
})
