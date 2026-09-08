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

// A ZodError reaches us in two shapes: bare, when a route calls
// `schema.parse` itself, and wrapped in an `H3Error.data` by h3's
// `getValidatedQuery`/`readValidatedBody` and by our own `parseDataAs`.
function zodErrorOf(error: unknown): ZodError | undefined {
  if (error instanceof ZodError) return error
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data: unknown }).data
    if (data instanceof ZodError) return data
  }
  return undefined
}

// Which route failed, without echoing what was sent. `event.path` carries
// the query string and a validation failure is exactly the case where that
// string is user- or attacker-supplied, so only the path survives. Outside
// a request — a cached handler revalidating in the background — there is no
// event and the fields are simply absent.
function failingRoute(): { method?: string, route?: string } {
  try {
    const event = useEvent()
    if (!event) return {}
    return { method: event.method, route: event.path.split('?')[0] }
  }
  catch {
    return {}
  }
}

// Field, rule and reason — never the value. Zod's own messages describe the
// constraint ("Invalid string: must match pattern /^-?\d+$/"), while an
// issue's `received`/`values`/`input` can carry the payload itself, which
// for a drifted RESPONSE would be customer data.
//
// `.map(String)` rather than a bare `join`: Zod 4 types `issue.path` as
// `PropertyKey[]`, and `Array.prototype.join` coerces via ToString, which
// THROWS on a symbol. A symbol key is rare, but the throw would happen
// inside the error handler — turning a 400 into an unhandled 500 and
// losing the log line that explains it. `String(symbol)` is the one
// conversion the spec allows.
function issueDigest(zod: ZodError) {
  return zod.issues.map(issue => ({
    path: issue.path.map(String).join('.'),
    code: issue.code,
    message: issue.message,
  }))
}

export function handleError(
  error: unknown,
): never {
  const zod = zodErrorOf(error)
  if (zod) {
    // Only h3 produces this shape: `getValidatedQuery`/`readValidatedBody`
    // wrap a failed inbound parse as a 400 `H3Error` whose `data` is the
    // ZodError. That is the REQUEST being wrong — client behaviour, the
    // same call the FetchError and H3Error branches below already make
    // for 4xx, and in practice almost all of it is bots: a WordPress
    // scanner sending `?page=gravitysmtp-settings` produced every one of
    // these in the 48h to 2026-09-08.
    //
    // Everything else stays at error. A branded failure is a drifted
    // RESPONSE (see `isResponseContractError`) — our fault, and a 4xx
    // only because `parseDataAs` defaults to 422, so it must never be
    // filed as client behaviour: the non-nullable `weightInfo` contract
    // broke add-to-cart for every zero-weight product and said nothing
    // but "Data parsing failed". A BARE ZodError has no provenance at
    // all — a route calling `schema.parse` by hand, on input or on a
    // payload — so it is reported loudly rather than assumed benign.
    const isInboundRequest
      = error instanceof H3Error && !isResponseContractError(error)
    if (isInboundRequest) {
      log.warn({
        action: 'validation:request',
        ...failingRoute(),
        issues: issueDigest(zod),
      })
    }
    else {
      log.error({
        action: 'validation:response',
        ...failingRoute(),
        issues: issueDigest(zod),
      })
    }
    // Logged once, here. Falling through would report the same failure a
    // second time from the H3Error branch under `action: 'h3'`.
    if (error instanceof H3Error) throw error
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation error',
      data: { issues: zod.issues },
    })
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
  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
  })
}

// DRF validation errors (and other upstream 4xx bodies) carry the
// field → messages payload the client turns into specific toasts and
// inline errors (e.g. checkout's ``{"phone": ["Enter a valid phone
// number."]}``). Like the allauth flows below, those payloads travel in
// ``createError``'s ``data``, which Nitro strips from thrown-error
// responses in production — so clients only ever saw the generic
// statusMessage. For upstream 4xx we therefore RETURN the body verbatim
// with the upstream status (returned bodies are not stripped); the
// client's ``onResponseError`` reads it as ``response._data`` in the
// exact shape Django produced. Everything else keeps the throw path.
// Same `undefined` return-type trick as ``forwardAllAuthFlow``: the
// 4xx status makes `$fetch` reject, so callers never see this value as
// a resolved result and the route's success type stays clean.
export function forwardUpstreamClientError(error: unknown): undefined {
  if (
    error instanceof FetchError
    && isClientError(error)
    && error.data !== undefined
  ) {
    const event = useEvent()
    log.warn({
      action: 'upstream:fetch',
      error: error.message,
      data: error.data,
    })
    setResponseStatus(event, error.statusCode ?? 400)
    return error.data as unknown as undefined
  }
  handleError(error)
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
  log.info({
    tag: 'auth',
    message: `allauth response: status ${error.data.status}`,
    ...(pendingFlow ? { pendingFlow: pendingFlow.id } : {}),
  })

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
    // No tokens in meta means KEEP the stored token, never clear: allauth's
    // expose_session_token only emits meta.session_token when the Django
    // session was modified AND the token CHANGED — an absent token on an
    // app-client response means "keep using the one you sent". Clearing here
    // wiped the pending-flow session mid-2FA (valid login code → 401
    // mfa_authenticate pending WITHOUT a token change → cookie cleared →
    // the WebAuthn options call went out anonymous and instantly 401'd).
    // Session teardown has exactly two owners: the 410 branch above, and
    // session.delete.ts's own finally block on explicit logout.
    else {
      log.info('auth', 'No token change in allauth response, keeping stored session token')
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
