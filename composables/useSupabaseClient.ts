import type { SupabaseClient } from '@supabase/supabase-js'

export const useSupabaseClient = () => {
  const { $supabase } = useNuxtApp()
  return $supabase as SupabaseClient
}
