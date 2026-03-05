import type { H3Event } from 'h3'
import { getSupabaseAuthClient } from './supabase'

export type AuthUser = {
  id: string
  email?: string
}

function readBearerToken(event: H3Event) {
  const header = getHeader(event, 'authorization')
  if (!header) return null
  const [type, token] = header.split(' ')
  if (type?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export async function requireAuthUser(event: H3Event): Promise<AuthUser> {
  const token = readBearerToken(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing Bearer token' })
  }

  const supabase = getSupabaseAuthClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid auth token' })
  }

  return { id: data.user.id, email: data.user.email }
}
