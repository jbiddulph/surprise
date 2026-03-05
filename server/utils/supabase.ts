import { createClient } from '@supabase/supabase-js'

export function getSupabaseAuthClient() {
  const config = useRuntimeConfig()
  const apiKey = config.supabaseServiceRoleKey || config.supabaseAnonKey
  if (!config.supabaseUrl || !apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Missing Supabase auth configuration' })
  }

  return createClient(config.supabaseUrl, apiKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export function getSupabaseServiceClient() {
  const config = useRuntimeConfig()
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw createError({ statusCode: 500, statusMessage: 'Missing Supabase service configuration' })
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}
