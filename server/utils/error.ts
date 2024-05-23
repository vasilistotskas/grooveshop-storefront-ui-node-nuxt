import { ZodError } from 'zod'
import { FetchError } from 'ofetch'
import { H3Error } from 'h3'
import type { AllAuthError, BadResponse, InvalidSessionResponse, NotAuthenticatedResponse } from '~/types/all-auth'
import { ZodBadResponse, ZodInvalidSessionResponse, ZodNotAuthenticatedResponse } from '~/types/all-auth'

export function isBadResponseError(error: any): error is { data: BadResponse } {
  return ZodBadResponse.safeParse(error.data).success
}

export function isNotAuthenticatedResponseError(error: any): error is { data: NotAuthenticatedResponse } {
  return ZodNotAuthenticatedResponse.safeParse(error.data).success
}

export function isInvalidSessionResponseError(error: any): error is { data: InvalidSessionResponse } {
  return ZodInvalidSessionResponse.safeParse(error.data).success
}

export function isAllAuthError(error: unknown): error is AllAuthError {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return false
  }

  return isBadResponseError(error) || isNotAuthenticatedResponseError(error) || isInvalidSessionResponseError(error)
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
      await allAuthHooks.callHookParallel('authChange', { detail: error.data })
    }
  }
  else {
    // Handle other types of errors if necessary
    console.error('Unexpected AllAuth error type:', error)
  }

  await handleError(error)
}
