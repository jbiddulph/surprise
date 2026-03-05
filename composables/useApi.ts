import { useAuthStore } from '~/stores/auth'

export function useApiAuthHeaders() {
  const auth = useAuthStore()
  return auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}
}
