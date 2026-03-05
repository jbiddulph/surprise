import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const debugEnabled = String(config.debugApi).toLowerCase() === 'true'

  if (!debugEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  let databaseHost: string | null = null
  let databasePort: string | null = null
  try {
    if (config.databaseUrl) {
      const parsed = new URL(config.databaseUrl)
      databaseHost = parsed.hostname
      databasePort = parsed.port || null
    }
  } catch {
    databaseHost = 'invalid-url'
  }

  const env = {
    hasDatabaseUrl: Boolean(config.databaseUrl),
    hasSupabaseUrl: Boolean(config.supabaseUrl),
    hasSupabaseAnonKey: Boolean(config.supabaseAnonKey),
    hasSupabaseServiceRoleKey: Boolean(config.supabaseServiceRoleKey),
    databaseHost,
    databasePort
  }

  let dbConnectOk = false
  let dbError: string | null = null
  let tables: Record<string, boolean> = {
    surpriseme_users: false,
    surpriseme_profiles: false,
    surpriseme_profile_images: false,
    surpriseme_predictions: false,
    surpriseme_questionnaires: false
  }

  try {
    await prisma.$queryRawUnsafe('select 1')
    dbConnectOk = true

    const rows = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      "select tablename from pg_tables where schemaname='public' and tablename like 'surpriseme_%'"
    )

    const found = new Set(rows.map((r) => r.tablename))
    tables = {
      surpriseme_users: found.has('surpriseme_users'),
      surpriseme_profiles: found.has('surpriseme_profiles'),
      surpriseme_profile_images: found.has('surpriseme_profile_images'),
      surpriseme_predictions: found.has('surpriseme_predictions'),
      surpriseme_questionnaires: found.has('surpriseme_questionnaires')
    }
  } catch (error: any) {
    dbError = error?.message || 'Unknown database error'
  }

  return {
    ok: env.hasDatabaseUrl && env.hasSupabaseUrl && env.hasSupabaseAnonKey && dbConnectOk,
    env,
    db: {
      connectOk: dbConnectOk,
      error: dbError,
      tables
    }
  }
})
