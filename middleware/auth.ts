import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const auth = useAuthStore()
  if (auth.isAuthenticated) return

  try {
    const supabase = useSupabaseClient()
    const { data } = await supabase.auth.getSession()
    const session = data.session

    if (session?.access_token && session.user?.id) {
      auth.setAuth({
        accessToken: session.access_token,
        userId: session.user.id,
        email: session.user.email
      })
      return
    }
  } catch {
    auth.clear()
  }

  return navigateTo('/login')
})
