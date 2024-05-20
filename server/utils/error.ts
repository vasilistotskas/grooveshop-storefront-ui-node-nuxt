import { ZodError } from 'zod'
import { FetchError } from 'ofetch'
import { H3Error } from 'h3'
import type { BadResponse, InvalidSessionResponse, NotAuthenticatedResponse } from '~/types/all-auth'
import { ZodBadResponse, ZodInvalidSessionResponse, ZodNotAuthenticatedResponse } from '~/types/all-auth'
import { useAllAuthSession } from '~/server/utils/api'

type isAllAuthError = {
  data: BadResponse | NotAuthenticatedResponse | InvalidSessionResponse
}

function isBadResponseError(error: any): error is { data: BadResponse } {
  return ZodBadResponse.safeParse(error.data).success
}

function isNotAuthenticatedResponseError(error: any): error is { data: NotAuthenticatedResponse } {
  return ZodNotAuthenticatedResponse.safeParse(error.data).success
}

function isInvalidSessionResponseError(error: any): error is { data: InvalidSessionResponse } {
  return ZodInvalidSessionResponse.safeParse(error.data).success
}

export function isAllAuthError(error: unknown): error is isAllAuthError {
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
  const session = await useAllAuthSession()

  if (isAllAuthError(error)) {
    if (error.data.status === 410) {
      await session.update({
        sessionToken: null,
      })
    }
    if (isNotAuthenticatedResponseError(error) || isInvalidSessionResponseError(error)) {
      if (error.data.meta?.session_token) {
        await session.update({
          sessionToken: error.data.meta.session_token,
        })
      }
      if (error.data.meta?.access_token) {
        await session.update({
          accessToken: error.data.meta.access_token,
        })
      }
      await allAuthHooks.callHookParallel('authChange', error.data)
    }
  }
  else {
    // Handle other types of errors if necessary
    console.error('Unexpected AllAuth error type:', error)
  }

  await handleError(error)
}
