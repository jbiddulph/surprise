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
  let columns: Record<string, boolean> = {
    users_role: false,
    images_category: false,
    images_approval_status: false,
    image_ratings_visitor_token: false
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

    const cols = await prisma.$queryRawUnsafe<Array<{ table_name: string; column_name: string }>>(
      `select table_name, column_name
       from information_schema.columns
       where table_schema='public'
         and (
           (table_name='surpriseme_users' and column_name='role') or
           (table_name='surpriseme_profile_images' and column_name in ('category','approval_status')) or
           (table_name='surpriseme_image_ratings' and column_name='visitor_token')
         )`
    )
    const colKey = new Set(cols.map((c) => `${c.table_name}.${c.column_name}`))
    columns = {
      users_role: colKey.has('surpriseme_users.role'),
      images_category: colKey.has('surpriseme_profile_images.category'),
      images_approval_status: colKey.has('surpriseme_profile_images.approval_status'),
      image_ratings_visitor_token: colKey.has('surpriseme_image_ratings.visitor_token')
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
      tables,
      columns
    }
  }
})
