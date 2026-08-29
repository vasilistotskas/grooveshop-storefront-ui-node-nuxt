/**
 * allauth error-response type guards — zod ``safeParse`` against the
 * upstream body shapes. Kept OUT of shared/utils/error.ts so the
 * universally-imported ``getErrorDetail``/``serializeError`` stay
 * zod-free (see the note there). shared/utils is auto-imported by
 * symbol, so the split is invisible to call sites.
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
