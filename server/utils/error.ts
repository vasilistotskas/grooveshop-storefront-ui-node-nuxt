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
} => ZodBadResponse.safeParse(error.data).success
export const isNotAuthenticatedResponseError = (error: any): error is {
  data: NotAuthenticatedResponse
} => ZodNotAuthenticatedResponse.safeParse(error.data).success
export const isInvalidSessionResponseError = (error: any): error is {
  data: InvalidSessionResponse
} => ZodInvalidSessionResponse.safeParse(error.data).success
export const isForbiddenResponseError = (error: any): error is {
  data: ForbiddenResponse
} => ZodForbiddenResponse.safeParse(error.data).success
export const isNotFoundResponseError = (error: any): error is {
  data: NotFoundResponse
} => ZodNotFoundResponse.safeParse(error.data).success
export const isConflictResponseError = (error: any): error is {
  data: ConflictResponse
} => ZodConflictResponse.safeParse(error.data).success

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
  if (error instanceof ZodError || error instanceof FetchError || error instanceof H3Error) {
    throw createError(error)
  }
  else {
    console.error('Unexpected error type:', error)
    throw error
  }
}

export async function handleAllAuthError(
  error: unknown,
) {
  const event = useEvent()

  if (isAllAuthError(error)) {
    if (error.data.status === 410) {
      console.log('Session expired')
      await clearUserSession(event)
    }
    if (isNotAuthenticatedResponseError(error) || isInvalidSessionResponseError(error)) {
      console.log('Not authenticated')
      if (error.data.meta?.session_token) {
        console.log('Setting session token')
        await setUserSession(event, {
          sessionToken: error.data.meta.session_token,
        })
      }
      if (error.data.meta?.access_token) {
        console.log('Setting access token')
        await setUserSession(event, {
          accessToken: error.data.meta.access_token,
        })
      }
    }
    await allAuthHooks.callHookParallel('authChange', { detail: error.data })
  }
  else {
    // Handle other types of errors if necessary
    console.error('Unexpected AllAuth error type:', error)
  }

  await handleError(error)
}
