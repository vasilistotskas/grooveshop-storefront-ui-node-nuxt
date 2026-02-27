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

export const isBadResponseError = (error: any): error is {
  data: BadResponse
} => {
  const result = ZodBadResponse.safeParse(error.data)
  return result.success
}
export const isNotAuthenticatedResponseError = (error: any): error is {
  data: NotAuthenticatedResponse
} => {
  const result = ZodNotAuthenticatedResponse.safeParse(error.data)
  return result.success
}
export const isInvalidSessionResponseError = (error: any): error is {
  data: InvalidSessionResponse
} => {
  const result = ZodInvalidSessionResponse.safeParse(error.data)
  return result.success
}
export const isForbiddenResponseError = (error: any): error is {
  data: ForbiddenResponse
} => {
  const result = ZodForbiddenResponse.safeParse(error.data)
  return result.success
}
export const isNotFoundResponseError = (error: any): error is {
  data: NotFoundResponse
} => {
  const result = ZodNotFoundResponse.safeParse(error.data)
  return result.success
}
export const isConflictResponseError = (error: any): error is {
  data: ConflictResponse
} => {
  const result = ZodConflictResponse.safeParse(error.data)
  return result.success
}
