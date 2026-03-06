import { requireAdminUser } from '../../utils/auth'
import { debugError, debugErrorSummary, debugLog, debugStatusMessage, getRequestId } from '../../utils/debug'

export default defineEventHandler(async (event) => {
  const requestId = getRequestId(event)
  try {
    debugLog(event, requestId, 'start')
    const user = await requireAdminUser(event)
    debugLog(event, requestId, 'admin.auth.ok', { userId: user.id })
    return { is_admin: true, user_id: user.id, request_id: requestId }
  } catch (error: any) {
    debugError(event, requestId, 'failed', error)
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: debugStatusMessage(event, requestId, `Admin access check failed: ${debugErrorSummary(error)}`)
    })
  }
})
