import type { H3Event } from 'h3'
import { getSupabaseAuthClient } from './supabase'
import { prisma } from './prisma'

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

export function getBearerToken(event: H3Event) {
  return readBearerToken(event)
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

export async function optionalAuthUser(event: H3Event): Promise<AuthUser | null> {
  const token = readBearerToken(event)
  if (!token) return null

  const supabase = getSupabaseAuthClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null

  return { id: data.user.id, email: data.user.email }
}

export async function requireAdminUser(event: H3Event): Promise<AuthUser> {
  const user = await requireAuthUser(event)
  let record: { role: string } | null = null
  try {
    record = await prisma.surpriseme_users.findUnique({
      where: { id: user.id },
      select: { role: true }
    })
  } catch (error: any) {
    const message = String(error?.message || '')
    const isMissingRoleColumn =
      error?.code === 'P2022' ||
      (message.toLowerCase().includes('role') && message.toLowerCase().includes('column'))

    if (isMissingRoleColumn) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Admin role schema missing. Apply latest database migrations.'
      })
    }

    throw error
  }

  if (!record || record.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  return user
}
