import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const auth = useAuthStore()
  const supabase = useSupabaseClient()

  if (!auth.isAuthenticated) {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (session?.access_token && session.user?.id) {
      auth.setAuth({
        accessToken: session.access_token,
        userId: session.user.id,
        email: session.user.email
      })
    }
  }

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }

  try {
    await $fetch('/api/admin/access', {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`
      }
    })
  } catch {
    return navigateTo('/dashboard')
  }
})
