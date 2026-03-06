import { prisma } from '../../utils/prisma'
import { requireAuthUser } from '../../utils/auth'
import { debugError, debugErrorSummary, debugLog, getRequestId } from '../../utils/debug'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const debugEnabled = String(config.debugApi).toLowerCase() === 'true'
  if (!debugEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const requestId = getRequestId(event)
  try {
    debugLog(event, requestId, 'start')
    const authHeader = getHeader(event, 'authorization') || ''
    const hasBearer = authHeader.toLowerCase().startsWith('bearer ')

    let authUserId: string | null = null
    let authError: string | null = null
    try {
      const user = await requireAuthUser(event)
      authUserId = user.id
      debugLog(event, requestId, 'auth.ok', { userId: user.id })
    } catch (error) {
      authError = debugErrorSummary(error)
      debugError(event, requestId, 'auth.failed', error)
    }

    const dbUserRows = authUserId
      ? await prisma.$queryRawUnsafe<Array<{ id: string; email: string | null; role: string | null; created_at: Date | null }>>(
          'select id, email, role, created_at from public.surpriseme_users where id = $1::uuid limit 1',
          authUserId
        )
      : []
    const dbUser = dbUserRows[0] ?? null

    const adminSchemaColumns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `select column_name
       from information_schema.columns
       where table_schema='public'
         and table_name in ('surpriseme_users','surpriseme_profile_images')
         and column_name in ('role','approval_status','category','approved_by','approved_at')`
    )
    const foundCols = new Set(adminSchemaColumns.map((c) => c.column_name))

    return {
      ok: Boolean(authUserId && dbUser),
      request_id: requestId,
      auth: {
        has_bearer: hasBearer,
        user_id: authUserId,
        error: authError
      },
      db: {
        user_row_found: Boolean(dbUser),
        role: dbUser?.role ?? null,
        is_admin: dbUser?.role === 'admin'
      },
      schema: {
        users_role: foundCols.has('role'),
        images_approval_status: foundCols.has('approval_status'),
        images_category: foundCols.has('category'),
        images_approved_by: foundCols.has('approved_by'),
        images_approved_at: foundCols.has('approved_at')
      }
    }
  } catch (error: any) {
    debugError(event, requestId, 'failed', error)
    throw createError({
      statusCode: 500,
      statusMessage: `Admin debug failed: ${debugErrorSummary(error)} [request_id=${requestId}]`
    })
  }
})
