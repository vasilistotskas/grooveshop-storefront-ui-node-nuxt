/**
 * allauth error-response type guards — zod ``safeParse`` against the
 * generated body shapes of allauth's headless document. Kept OUT of
 * shared/utils/error.ts so the universally-imported ``serializeError`` stays
 * zod-free (see the note there). shared/utils is auto-imported by symbol, so
 * the split is invisible to call sites.
 */
// Common shape: ofetch's ``FetchError`` has a ``data`` property that
// carries the upstream JSON body. We narrow on ``data`` only — the
// Zod parse is the source of truth for whether the body matches.
function readData(error: unknown): unknown {
  if (error && typeof error === 'object' && 'data' in error) {
    return (error as { data: unknown }).data
  }
  return undefined
}

// The document leaves `status` and `errors` optional on its 400 body, so any
// object would parse: a 400 is told apart by carrying both.
export const isBadResponseError = (error: unknown): error is {
  data: AllAuthErrorResponse
} => {
  const parsed = zAllAuthErrorResponse.safeParse(readData(error))
  return parsed.success && parsed.data.status === 400 && parsed.data.errors !== undefined
}

export const isNotAuthenticatedResponseError = (error: unknown): error is {
  data: AllAuthNotAuthenticated
} => zAllAuthAuthenticationResponse.safeParse(readData(error)).success

export const isInvalidSessionResponseError = (error: unknown): error is {
  data: AllAuthSessionGone
} => zAllAuthSessionGoneResponse.safeParse(readData(error)).success

export const isForbiddenResponseError = (error: unknown): error is {
  data: AllAuthForbiddenResponse
} => zAllAuthForbiddenResponse.safeParse(readData(error)).success

export const isConflictResponseError = (error: unknown): error is {
  data: AllAuthConflictResponse
} => zAllAuthConflictResponse.safeParse(readData(error)).success

// The two answers the document gives no schema for, only a status (429) and
// the status with the setup secret (404), are told apart by that status.
export const isNotFoundResponseError = (error: unknown): error is {
  data: AllAuthTotpNotFound
} => {
  const data = readData(error)
  return typeof data === 'object' && data !== null && 'status' in data && data.status === 404
    && 'meta' in data && typeof data.meta === 'object' && data.meta !== null && 'secret' in data.meta
}

export const isTooManyRequestsResponseError = (error: unknown): error is {
  data: AllAuthTooManyRequests
} => {
  const data = readData(error)
  return typeof data === 'object' && data !== null && 'status' in data && data.status === 429
}
