export interface SerializedError {
  message: string
  statusCode?: number
  statusMessage?: string
  data?: Record<string, unknown>
}

export function serializeError(err: unknown): SerializedError {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return {
      message: String(e.message ?? e.statusMessage ?? 'Unknown error'),
      statusCode: typeof e.statusCode === 'number' ? e.statusCode : undefined,
      statusMessage: typeof e.statusMessage === 'string' ? e.statusMessage : undefined,
      data: e.data != null && typeof e.data === 'object' ? e.data as Record<string, unknown> : undefined,
    }
  }
  return { message: String(err) }
}

/** Safely pull a user-facing detail string from a thrown ``unknown``.
 *  Reads ``err.data.detail`` (DRF/allauth shape) first, then falls back
 *  to ``err.message``. Returns ``undefined`` when neither is a string —
 *  callers default to a translated fallback. Lets ``catch`` blocks
 *  drop the ``error: any`` annotation without verbose narrowing at
 *  every site. */
export function getErrorDetail(err: unknown): string | undefined {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    const data = e.data
    if (data && typeof data === 'object' && 'detail' in data) {
      const detail = (data as Record<string, unknown>).detail
      if (typeof detail === 'string' && detail.length > 0) return detail
    }
    if (typeof e.message === 'string' && e.message.length > 0) return e.message
  }
  return undefined
}

// Common shape: ofetch's ``FetchError`` has a ``data`` property that
// carries the upstream JSON body. We narrow on ``data`` only — the
// Zod parse is the source of truth for whether the body matches.
function readData(error: unknown): unknown {
  if (error && typeof error === 'object' && 'data' in error) {
    return (error as { data: unknown }).data
  }
  return undefined
}

export const isBadResponseError = (error: unknown): error is {
  data: BadResponse
} => {
  const result = ZodBadResponse.safeParse(readData(error))
  return result.success
}
export const isNotAuthenticatedResponseError = (error: unknown): error is {
  data: NotAuthenticatedResponse
} => {
  const result = ZodNotAuthenticatedResponse.safeParse(readData(error))
  return result.success
}
export const isInvalidSessionResponseError = (error: unknown): error is {
  data: InvalidSessionResponse
} => {
  const result = ZodInvalidSessionResponse.safeParse(readData(error))
  return result.success
}
export const isForbiddenResponseError = (error: unknown): error is {
  data: ForbiddenResponse
} => {
  const result = ZodForbiddenResponse.safeParse(readData(error))
  return result.success
}
export const isNotFoundResponseError = (error: unknown): error is {
  data: NotFoundResponse
} => {
  const result = ZodNotFoundResponse.safeParse(readData(error))
  return result.success
}
export const isConflictResponseError = (error: unknown): error is {
  data: ConflictResponse
} => {
  const result = ZodConflictResponse.safeParse(readData(error))
  return result.success
}
