import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin({
  name: 'auth-init',
  enforce: 'post',
  async setup() {
    const auth = useAuthStore()
    const { $supabase } = useNuxtApp()
    const supabase = $supabase

    if (!supabase) {
      auth.clear()
      return
    }

    try {
      const { data } = await supabase.auth.getSession()
      const session = data.session
      if (session?.access_token && session.user?.id) {
        auth.setAuth({
          accessToken: session.access_token,
          userId: session.user.id,
          email: session.user.email
        })
      } else {
        auth.clear()
      }
    } catch {
      auth.clear()
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token && session.user?.id) {
        auth.setAuth({
          accessToken: session.access_token,
          userId: session.user.id,
          email: session.user.email
        })
        return
      }

      auth.clear()
    })
  }
})
