import { createClient } from '@supabase/supabase-js'

export function getSupabaseServiceClient() {
  const config = useRuntimeConfig()
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw createError({ statusCode: 500, statusMessage: 'Missing Supabase service configuration' })
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
