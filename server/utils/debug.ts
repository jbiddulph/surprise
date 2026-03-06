import type { H3Event } from 'h3'

function debugEnabled() {
  const config = useRuntimeConfig()
  return String(config.debugApi).toLowerCase() === 'true'
}

export function getRequestId(event: H3Event) {
  return getHeader(event, 'x-request-id') || crypto.randomUUID()
}

export function debugLog(event: H3Event, requestId: string, step: string, meta?: Record<string, unknown>) {
  if (!debugEnabled()) return
  console.info('[api-debug]', {
    requestId,
    method: event.method,
    path: event.path,
    step,
    meta: meta ?? {}
  })
}

export function debugError(event: H3Event, requestId: string, step: string, error: unknown) {
  if (!debugEnabled()) return

  const normalized =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { error }

  console.error('[api-debug]', {
    requestId,
    method: event.method,
    path: event.path,
    step,
    ...normalized
  })
}

export function debugStatusMessage(event: H3Event, requestId: string, fallback: string) {
  if (!debugEnabled()) return fallback
  return `${fallback} [request_id=${requestId}]`
}

export function debugErrorSummary(error: unknown) {
  if (error && typeof error === 'object') {
    const maybe = error as {
      code?: string
      message?: string
      statusMessage?: string
      statusCode?: number
      name?: string
    }

    const code = maybe.code ? String(maybe.code) : null
    const message = maybe.statusMessage || maybe.message || maybe.name || 'Unknown error'
    return code ? `${message} (code=${code})` : String(message)
  }

  return String(error || 'Unknown error')
}
