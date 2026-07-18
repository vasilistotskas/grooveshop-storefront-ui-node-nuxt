import { ZodError } from 'zod'
import { FetchError } from 'ofetch'
import { H3Error } from 'h3'
import type { H3Event } from 'h3'

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
    // A 4xx from Django is client behaviour (wrong password, spam-filtered
    // form, unknown id) — warn, not error, or it drowns genuine 5xx faults.
    // Same 4xx/5xx split the evlog-client-error-level plugin applies to the
    // request's wide event.
    if (isClientError(error)) {
      log.warn({ action: 'upstream:fetch', error: error.message })
    }
    else {
      log.error({ action: 'upstream:fetch', error: error.message })
    }
    const statusCode = error.statusCode ?? 500
    // Forward upstream Django response bodies (DRF validation errors,
    // allauth detail) only for client errors. 5xx bodies can leak
    // dependency-internal diagnostics (e.g. dj-stripe, allauth) so
    // we drop them and surface a generic message instead.
    const safeData = statusCode < 500 ? error.data : undefined
    throw createError({
      statusCode,
      statusMessage: error.statusMessage ?? error.message,
      data: safeData,
    })
  }
  if (error instanceof H3Error) {
    if (isClientError(error)) {
      log.warn({ action: 'h3', error: error.message })
    }
    else {
      log.error({ action: 'h3', error: error.message })
    }
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

function pendingFlowOf(error: AllAuthError) {
  const flows = (error.data as { data?: { flows?: Array<{ id: string, is_pending?: boolean }> } }).data?.flows
  return flows?.find(flow => flow.is_pending)
}

// Reconcile the encrypted user session from an allauth error response
// (persist the flow's session/access token, or clear on expiry) and strip the
// internal forwarding headers. Shared by the throw path (handleAllAuthError)
// and the forward path (forwardAllAuthFlow).
async function syncAllAuthSessionFromError(error: unknown, event: H3Event) {
  if (!isAllAuthError(error)) {
    log.error({ action: 'auth:unexpected', error })
    return
  }

  const pendingFlow = pendingFlowOf(error)
  // Distinguish a 401 that is really allauth's "advance to next step" signal
  // (login_by_code code sent, mfa pending) from a genuine auth failure.
  log.info(
    'auth',
    `allauth response: status ${error.data.status}`,
    pendingFlow ? { pendingFlow: pendingFlow.id } : {},
  )

  if (error.data.status === 410) {
    log.info('auth', 'Session expired (410), clearing user session')
    await clearUserSession(event)
  }
  else if (isNotAuthenticatedResponseError(error) || isInvalidSessionResponseError(error)) {
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

export async function handleAllAuthError(
  error: unknown,
) {
  const event = useEvent()
  await syncAllAuthSessionFromError(error, event)
  handleError(error)
}

const HTTP_STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  410: 'Gone',
}

// allauth 4xx bodies ARE the API contract, not incidental error noise: a 401
// with a *pending* flow means "advance to the next step" (2FA after a correct
// password, confirm after a code request), and a 400 carries the `errors`
// array the client translates into specific toasts (incorrect_code,
// invalid_login, ...). Those payloads travel in `createError`'s `data`, which
// Nitro strips from thrown-error responses — so the client saw none of it.
// For any allauth 4xx we therefore RETURN the payload (returned bodies are not
// stripped) with the upstream status, mirroring the wrapper shape the client
// reads (`error.data.data === payload`). Only non-allauth errors and 5xx still
// throw via handleAllAuthError. The client-side `auth:change` interceptor only
// reacts to 401/410, so forwarding a 400 cannot trigger navigation.
// Return type is `undefined` on purpose: the client only ever receives this
// body via a thrown $fetch error (the response status is 4xx, so `$fetch`
// rejects) — never as a resolved value — so keeping it out of the handler's
// success type avoids polluting the typed `login()`/`requestLoginCode()`
// return. The object is still emitted at runtime for Nitro to serialize.
export async function forwardAllAuthFlow(error: unknown): Promise<undefined> {
  const event = useEvent()
  if (isAllAuthError(error)) {
    const status = error.data.status
    // A 401 WITHOUT a pending flow is allauth's terminal "you are not signed
    // in" state — e.g. the success response of a completed password reset or
    // email verification when auto-login is off. Forwarding it would make the
    // client's 401 interceptor emit a spurious LOGGED_OUT (session-expired
    // toast + navigation) for an anonymous user mid-flow, so only 401s that
    // carry a pending flow are forwarded; the rest keep the throw path.
    const forwardable = typeof status === 'number'
      && status >= 400 && status < 500
      && (status !== 401 || Boolean(pendingFlowOf(error)))
    if (forwardable) {
      await syncAllAuthSessionFromError(error, event)
      setResponseStatus(event, status)
      return {
        statusCode: status,
        statusMessage: HTTP_STATUS_TEXT[status] ?? 'Error',
        data: error.data,
      } as unknown as undefined
    }
  }
  await handleAllAuthError(error)
  return undefined
}
