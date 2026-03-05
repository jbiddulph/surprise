import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const client = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey)

  return {
    provide: {
      supabase: client
    }
  }
})
