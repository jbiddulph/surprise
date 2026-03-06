import { useAuthStore } from '~/stores/auth'

export function useApiAuthHeaders() {
  const auth = useAuthStore()
  return auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}
}

export async function useApiAuthHeadersSafe() {
  const auth = useAuthStore()
  if (auth.accessToken) {
    return { Authorization: `Bearer ${auth.accessToken}` }
  }

  const supabase = useSupabaseClient()
  const { data } = await supabase.auth.getSession()
  const session = data.session
  if (session?.access_token && session.user?.id) {
    auth.setAuth({
      accessToken: session.access_token,
      userId: session.user.id,
      email: session.user.email
    })
    return { Authorization: `Bearer ${session.access_token}` }
  }

  return {}
}
