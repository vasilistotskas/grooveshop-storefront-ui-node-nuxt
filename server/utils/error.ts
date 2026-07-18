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

// allauth headless replies to a login on a 2FA account, or a login-by-code
// request, with HTTP 401 carrying a *pending* flow — its normal "advance to
// the next step" signal, not a failure. The flow payload lives in
// `createError`'s `data`, but Nitro strips that from thrown-error responses,
// so the client never sees the flow and cannot route to it. For a pending-flow
// 4xx we therefore RETURN the payload (returned bodies are not stripped),
// mirroring the wrapper shape the client reads (`error.data.data === payload`).
// Genuine errors (no pending flow, or 5xx) still throw via handleAllAuthError.
// Return type is `undefined` on purpose: the client only ever receives this
// body via a thrown $fetch error (the response status is 4xx, so `$fetch`
// rejects) — never as a resolved value — so keeping it out of the handler's
// success type avoids polluting the typed `login()`/`requestLoginCode()`
// return. The object is still emitted at runtime for Nitro to serialize.
export async function forwardAllAuthFlow(error: unknown): Promise<undefined> {
  const event = useEvent()
  if (isAllAuthError(error)) {
    const status = error.data.status
    const pendingFlow = pendingFlowOf(error)
    if (pendingFlow && typeof status === 'number' && status < 500) {
      await syncAllAuthSessionFromError(error, event)
      setResponseStatus(event, status)
      return { statusCode: status, statusMessage: 'Unauthorized', data: error.data } as unknown as undefined
    }
  }
  await handleAllAuthError(error)
  return undefined
}
