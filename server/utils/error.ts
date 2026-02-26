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

export function handleError(
  error: unknown,
): never {
  if (import.meta.dev) console.error('Handling error')
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
    if (import.meta.dev) console.info('handleAllAuthError: status', error.data.status)

    if (error.data.status === 410) {
      if (import.meta.dev) console.info('Session expired (410), clearing user session')
      await clearUserSession(event)
    }

    if (isNotAuthenticatedResponseError(error) || isInvalidSessionResponseError(error)) {
      if (import.meta.dev) console.info('Not authenticated or invalid session, updating tokens')

      if (error.data.meta?.session_token) {
        await setUserSession(event, {
          secure: { sessionToken: error.data.meta.session_token },
        })
      }
      if (error.data.meta?.access_token) {
        await setUserSession(event, {
          secure: { accessToken: error.data.meta.access_token },
        })
      }

      if (!error.data.meta?.is_authenticated && (!error.data.meta?.session_token && !error.data.meta?.access_token)) {
        if (import.meta.dev) console.info('No tokens in error response, clearing user session')
        await clearUserSession(event)
      }
    }

    clearResponseHeaders(event, ['X-Session-Token', 'Authorization'])
  }
  else {
    console.error('Unexpected AllAuth error type:', error)
  }

  await handleError(error)
}
