import { ZodError } from 'zod'
import { FetchError } from 'ofetch'
import { H3Error } from 'h3'
import type {
  AllAuthError,
  BadResponse,
  ConflictResponse,
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

export function isAllAuthError(error: unknown): error is AllAuthError {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return false
  }

  return isBadResponseError(error) || isNotAuthenticatedResponseError(error)
    || isInvalidSessionResponseError(error) || isForbiddenResponseError(error)
    || isNotFoundResponseError(error) || isConflictResponseError(error)
}

export async function handleError(
  error: unknown,
) {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    if (error.data instanceof ZodError) {
      console.error('Zod Message:', error.data.message)
    }
  }
  if (error instanceof ZodError || error instanceof FetchError || error instanceof H3Error) {
    if (error instanceof ZodError) {
      console.error('Zod Message:', error.message)
    }
    else if (error instanceof FetchError) {
      console.error('Fetch Error:', error.message)
    }
    else {
      console.error('H3 Error:', error.message)
    }
    throw createError(error)
  }
  else {
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }
}

export async function handleAllAuthError(
  error: unknown,
) {
  const event = useEvent()

  if (isAllAuthError(error)) {
    if (error.data.status === 410) {
      await clearUserSession(event)
    }
    if (isNotAuthenticatedResponseError(error) || isInvalidSessionResponseError(error)) {
      if (error.data.meta?.session_token) {
        await setUserSession(event, {
          sessionToken: error.data.meta.session_token,
        })
      }
      if (error.data.meta?.access_token) {
        await setUserSession(event, {
          accessToken: error.data.meta.access_token,
        })
      }
    }
    await allAuthHooks.callHookParallel('authChange', { detail: error.data })
  }
  else {
    console.error('Unexpected AllAuth error type:', error)
  }

  await handleError(error)
}
