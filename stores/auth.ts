import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: '' as string,
    userId: '' as string,
    email: '' as string
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken && state.userId)
  },
  actions: {
    setAuth(payload: { accessToken: string; userId: string; email?: string }) {
      this.accessToken = payload.accessToken
      this.userId = payload.userId
      this.email = payload.email ?? ''
    },
    clear() {
      this.accessToken = ''
      this.userId = ''
      this.email = ''
    }
  },
  persist: false
})
