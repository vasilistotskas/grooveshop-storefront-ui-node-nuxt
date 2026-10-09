import { ZodError } from 'zod'
import { FetchError } from 'ofetch'
import { createError, isNuxtError, setResponseStatus } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

export function isAllAuthError(error: unknown): error is AllAuthError {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return false
  }

  return isBadResponseError(error) || isNotAuthenticatedResponseError(error)
    || isInvalidSessionResponseError(error) || isForbiddenResponseError(error)
    || isNotFoundResponseError(error) || isConflictResponseError(error)
}

/** A validation issue as Standard Schema reports it: what `nuxt/server`'s validators put in `data.issues`. */
interface ValidationIssue {
  message: string
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>
  code?: string
}

// A drifted RESPONSE: `parseDataAs` wraps the ZodError in its error's
// `data`. A bare ZodError is a route calling `schema.parse` by hand.
function zodErrorOf(error: unknown): ZodError | undefined {
  if (error instanceof ZodError) return error
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data: unknown }).data
    if (data instanceof ZodError) return data
  }
  return undefined
}

// A malformed REQUEST: `getValidatedQuery`/`readValidatedBody` and
// `parseRouterParams` reject it as a 400 whose `data.issues` lists what
// failed.
function requestIssuesOf(error: unknown): readonly ValidationIssue[] | undefined {
  if (!isNuxtError(error) || isResponseContractError(error)) return undefined
  const data: unknown = error.data
  if (typeof data !== 'object' || data === null || !('issues' in data)) return undefined
  return Array.isArray(data.issues) ? data.issues : undefined
}

// Which route failed, without echoing what was sent: a validation failure
// is exactly the case where the query string is user- or
// attacker-supplied, so only the path survives.
function failingRoute(event: RequestEvent): { method: string, route: string } {
  return { method: event.req.method, route: event.url.pathname }
}

// Field, rule and reason — never the value. Zod's own messages describe the
// constraint ("Invalid string: must match pattern /^-?\d+$/"), while an
// issue's `received`/`values`/`input` can carry the payload itself, which
// for a drifted RESPONSE would be customer data.
//
// `String()` on every segment rather than a bare `join`: a path is typed
// `PropertyKey[]`, and `Array.prototype.join` coerces via ToString, which
// THROWS on a symbol. A symbol key is rare, but the throw would happen
// inside the error handler — turning a 400 into an unhandled 500 and
// losing the log line that explains it. `String(symbol)` is the one
// conversion the spec allows.
function issueDigest(issues: readonly ValidationIssue[]) {
  return issues.map(issue => ({
    path: (issue.path ?? []).map(segment => String(typeof segment === 'object' ? segment.key : segment)).join('.'),
    code: issue.code,
    message: issue.message,
  }))
}

export function handleError(
  event: RequestEvent,
  error: unknown,
): never {
  const requestIssues = requestIssuesOf(error)
  if (requestIssues) {
    // The REQUEST is wrong — client behaviour, the same call the
    // FetchError and HTTP-error branches below make for 4xx, and in
    // practice almost all of it is bots: a WordPress scanner sending
    // `?page=gravitysmtp-settings` produced every one of these in the 48h
    // to 2026-09-08. Logged once, here: falling through would report the
    // same failure a second time under `action: 'h3'`.
    log.warn({
      action: 'validation:request',
      ...failingRoute(event),
      issues: issueDigest(requestIssues),
    })
    throw error
  }
  const zod = zodErrorOf(error)
  if (zod) {
    // A branded failure is a drifted RESPONSE (see
    // `isResponseContractError`) — our fault, and a 4xx only because
    // `parseDataAs` defaults to 422, so it must never be filed as client
    // behaviour: the non-nullable `weightInfo` contract broke add-to-cart
    // for every zero-weight product and said nothing but "Data parsing
    // failed". A BARE ZodError has no provenance at all — a route calling
    // `schema.parse` by hand, on input or on a payload — so it is
    // reported loudly rather than assumed benign.
    log.error({
      action: 'validation:response',
      ...failingRoute(event),
      issues: issueDigest(zod.issues),
    })
    if (isNuxtError(error)) throw error
    throw createError({
      status: 400,
      statusText: 'Validation error',
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
    const status = error.status ?? 500
    // Forward upstream Django response bodies (DRF validation errors,
    // allauth detail) only for client errors. 5xx bodies can leak
    // dependency-internal diagnostics (e.g. dj-stripe, allauth) so
    // we drop them and surface a generic message instead.
    const safeData = status < 500 ? error.data : undefined
    throw createError({
      status,
      statusText: error.statusText ?? error.message,
      data: safeData,
    })
  }
  if (isNuxtError(error)) {
    if (isClientError(error)) {
      log.warn({ action: 'h3', error: error.message })
    }
    else {
      log.error({ action: 'h3', error: error.message })
    }
    throw error
  }
  throw createError({
    status: 500,
    statusText: 'Internal Server Error',
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
export function forwardUpstreamClientError(event: RequestEvent, error: unknown): undefined {
  if (
    error instanceof FetchError
    && isClientError(error)
    && error.data !== undefined
  ) {
    log.warn({
      action: 'upstream:fetch',
      error: error.message,
      data: error.data,
    })
    setResponseStatus(event, error.status ?? 400)
    return error.data as unknown as undefined
  }
  handleError(event, error)
}

function pendingFlowOf(error: AllAuthError) {
  const flows = (error.data as { data?: { flows?: Array<{ id: string, is_pending?: boolean }> } }).data?.flows
  return flows?.find(flow => flow.is_pending)
}

// Reconcile the encrypted user session from an allauth error response
// (persist the flow's session/access token, or clear on expiry) and strip the
// internal forwarding headers. Shared by the throw path (handleAllAuthError)
// and the forward path (forwardAllAuthFlow).
async function syncAllAuthSessionFromError(event: RequestEvent, error: unknown) {
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

  event.res.headers.delete('X-Session-Token')
  event.res.headers.delete('Authorization')
}

export async function handleAllAuthError(
  event: RequestEvent,
  error: unknown,
) {
  await syncAllAuthSessionFromError(event, error)
  handleError(event, error)
}

// One reason phrase per status an allauth error can carry, keyed by that
// union: a status added to `AllAuthError` fails the build here until it
// has one, instead of going out as a generic "Error".
const HTTP_STATUS_TEXT: Record<AllAuthError['data']['status'], string> = {
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
export async function forwardAllAuthFlow(event: RequestEvent, error: unknown): Promise<undefined> {
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
      await syncAllAuthSessionFromError(event, error)
      setResponseStatus(event, status)
      return {
        statusCode: status,
        statusMessage: HTTP_STATUS_TEXT[status],
        data: error.data,
      } as unknown as undefined
    }
  }
  await handleAllAuthError(event, error)
  return undefined
}
