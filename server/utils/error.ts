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
  if (typeof error === 'object' && error !== null && 'data' in error) {
    if ((error as { data: unknown }).data instanceof ZodError) {
      log.error({ action: 'validation', error: (error as { data: ZodError }).data.message })
    }
  }
  if (error instanceof FetchError) {
    log.error({ action: 'upstream:fetch', error: error.message })
    throw createError({
      statusCode: error.statusCode ?? 500,
      statusMessage: error.statusMessage ?? error.message,
      data: error.data,
    })
  }
  if (error instanceof H3Error) {
    log.error({ action: 'h3', error: error.message })
    throw error
  }
  if (error instanceof ZodError) {
    log.error({ action: 'validation', error: error.message })
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      data: { issues: error.issues },
    })
  }
  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
  })
}

export async function handleAllAuthError(
  error: unknown,
) {
  const event = useEvent()

  if (isAllAuthError(error)) {
    log.info('auth', `handleAllAuthError: status ${error.data.status}`)

    if (error.data.status === 410) {
      log.info('auth', 'Session expired (410), clearing user session')
      await clearUserSession(event)
    }

    if (isNotAuthenticatedResponseError(error) || isInvalidSessionResponseError(error)) {
      log.info('auth', 'Not authenticated or invalid session, updating tokens')

      const hasTokens = error.data.meta?.session_token || error.data.meta?.access_token
      if (hasTokens) {
        const existingSession = await getUserSession(event)
        await replaceUserSession(event, {
          ...existingSession,
          secure: {
            sessionToken: error.data.meta?.session_token ?? existingSession.secure?.sessionToken,
            accessToken: error.data.meta?.access_token ?? existingSession.secure?.accessToken,
          },
        })
      }
      else if (!error.data.meta?.is_authenticated) {
        log.info('auth', 'No tokens in error response, clearing user session')
        await clearUserSession(event)
      }
    }

    clearResponseHeaders(event, ['X-Session-Token', 'Authorization'])
  }
  else {
    log.error({ action: 'auth:unexpected', error })
  }

  handleError(error)
}
