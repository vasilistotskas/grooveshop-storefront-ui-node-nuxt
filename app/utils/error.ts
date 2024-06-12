import type { ErrorWithDetail } from '~/types'
import type {
  AllAuthClientError,
  BadResponse,
  ConflictResponse,
  Flow,
  ForbiddenResponse,
  InvalidSessionResponse,
  NotAuthenticatedResponse,
  NotFoundResponse,
} from '~/types/all-auth'
import {
  ZodBadResponse,
  ZodConflictResponse,
  ZodForbiddenResponse,
  ZodInvalidSessionResponse,
  ZodNotAuthenticatedResponse,
  ZodNotFoundResponse,
} from '~/types/all-auth'

export function isErrorWithDetail(error: unknown): error is ErrorWithDetail {
  if (typeof error === 'object' && error !== null) {
    const errRecord = error as Record<string, unknown>
    if ('data' in errRecord && typeof errRecord.data === 'object' && errRecord.data !== null) {
      const data = errRecord.data as Record<string, unknown>
      if ('data' in data && typeof data.data === 'object' && data.data !== null) {
        const innerData = data.data as Record<string, unknown>
        return 'detail' in innerData && typeof innerData.detail === 'string'
      }
    }
  }
  return false
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

export function isAllAuthClientError(error: unknown): error is AllAuthClientError {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return false
  }

  return isBadResponseError(error.data) || isNotAuthenticatedResponseError(error.data)
    || isInvalidSessionResponseError(error.data) || isForbiddenResponseError(error.data)
    || isNotFoundResponseError(error.data) || isConflictResponseError(error.data)
}

export const pendingFlowInError = (error: unknown): Flow | null => {
  if (isAllAuthClientError(error)) {
    if (!('data' in error.data.data)) {
      return null
    }
    if (!('flows' in error.data.data.data)) {
      return null
    }
    const pendingFlow = error.data.data.data.flows.find(flow => flow.is_pending)
    if (pendingFlow) {
      return pendingFlow
    }
  }
  return null
}
