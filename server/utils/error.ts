import { ZodError } from 'zod'
import { FetchError } from 'ofetch'
import { H3Error } from 'h3'

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
    console.debug('Is all auth error')
    if (error.data.status === 410) {
      console.debug('Clearing user session')
      await clearUserSession(event)
    }
    if (isNotAuthenticatedResponseError(error) || isInvalidSessionResponseError(error)) {
      if (error.data.meta?.session_token) {
        console.debug('Setting user session')
        await setUserSession(event, {
          sessionToken: error.data.meta.session_token,
        })
      }
      if (error.data.meta?.access_token) {
        console.debug('Setting user access token')
        await setUserSession(event, {
          accessToken: error.data.meta.access_token,
        })
      }
    }
    clearResponseHeaders(event, ['X-Session-Token', 'Authorization'])
    await allAuthHooks.callHookParallel('authChange', { detail: error.data })
  }
  else {
    console.error('Unexpected AllAuth error type:', error)
  }

  await handleError(error)
}
