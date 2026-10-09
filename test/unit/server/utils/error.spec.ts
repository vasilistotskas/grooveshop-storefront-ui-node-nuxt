import { H3Error } from 'h3'
import { createError, defineEventHandler, getValidatedQuery, isNuxtError } from 'nuxt/server'
import type { NuxtErrorLike, RequestEvent } from 'nuxt/server'
import { $fetch, FetchError } from 'ofetch'
import { describe, expect, it } from 'vitest'
import { z, ZodError } from 'zod'
import {
  forwardAllAuthFlow,
  forwardUpstreamClientError,
  handleAllAuthError,
  handleError,
  isAllAuthError,
} from '~~/server/utils/error'
import { parseDataAs } from '~~/server/utils/parser'
import {
  backend,
  callRoute,
  createRequestEvent,
  jsonResponse,
  log,
  testSession,
} from '~~/test/helpers/nitro'

// ── Real payloads ─────────────────────────────────────────────────────

/** allauth bodies, in the shapes `shared/schemas/error/all-auth/*` accept. */
const allauth = {
  bad: { status: 400, errors: [{ code: 'incorrect_code', param: 'code', message: 'Incorrect code.' }] },
  pendingMfa: (meta: Record<string, unknown> = {}) => ({
    status: 401,
    data: { flows: [{ id: 'login' }, { id: 'mfa_authenticate', is_pending: true, types: ['totp'] }] },
    meta: { is_authenticated: false, ...meta },
  }),
  notSignedIn: { status: 401, data: { flows: [{ id: 'login' }] }, meta: { is_authenticated: false } },
  forbidden: { status: 403 },
  notFound: { status: 404, meta: { secret: 's' } },
  conflict: { status: 409 },
  expired: { status: 410, data: { flows: [{ id: 'login' }] }, meta: { is_authenticated: false } },
}

/**
 * A real `FetchError`: ofetch's own, as a Django call raises it for a
 * backend answer of `status` with `body`. POST, so ofetch does not retry.
 */
async function upstreamError(status: number, body?: unknown): Promise<FetchError> {
  backend.replyOnce(jsonResponse(body, status))
  return await rejectionOf($fetch('http://backend.test/api/v1/upstream', { method: 'POST' }), FetchError)
}

/** What `handleError` threw. It always throws, an HTTP error: that is its contract. */
function thrownBy(fn: () => unknown): NuxtErrorLike {
  try {
    fn()
  }
  catch (error) {
    if (!isNuxtError(error)) throw new Error(`expected an HTTP error, got ${String(error)}`, { cause: error })
    return error
  }
  throw new Error('expected a throw')
}

const INBOUND_ISSUE = {
  code: 'invalid_format' as const,
  format: 'regex' as const,
  pattern: '/^-?\\d+$/',
  path: ['page'],
  message: 'Invalid string: must match pattern /^-?\\d+$/',
  input: 'gravitysmtp-settings',
}

/**
 * What `nuxt/server`'s validators throw for a malformed request: a 400
 * whose `data.issues` lists what failed (`getValidatedQuery` below proves
 * the shape against the real thing).
 */
function inboundValidationError(path: PropertyKey[] = ['page']) {
  return createError({
    status: 400,
    statusText: 'Validation failed',
    message: 'Validation failed',
    data: { issues: [{ ...INBOUND_ISSUE, path }], message: 'Validation failed' },
  })
}

/** The error `promise` rejects with, which must be an `ErrorClass`; a promise that resolves fails the test. */
async function rejectionOf<E extends Error>(promise: Promise<unknown>, ErrorClass: new (...args: any[]) => E): Promise<E> {
  const outcome = await promise.then(() => undefined, (caught: unknown) => caught)
  if (!(outcome instanceof ErrorClass)) throw new Error(`expected a ${ErrorClass.name} rejection, got ${String(outcome)}`)
  return outcome
}

/** What `parseDataAs` throws when a Django response fails its schema. */
function responseContractError(): Promise<Error> {
  return rejectionOf(parseDataAs({ weightInfo: null }, z.object({ weightInfo: z.object({}) })), Error)
}

const probe = () => createRequestEvent({ method: 'GET', url: '/api/blog/posts?page=gravitysmtp-settings' })

// ── isAllAuthError ────────────────────────────────────────────────────

describe('isAllAuthError', () => {
  it.each(Object.entries({ ...allauth, pendingMfa: allauth.pendingMfa() }))('recognises the allauth %s body', (_name, body) => {
    expect(isAllAuthError({ data: body })).toBe(true)
  })

  it.each([
    ['a string', 'boom'],
    ['null', null],
    ['an object without data', { message: 'x' }],
    ['a DRF error body', { data: { detail: 'Not found.' } }],
    ['a 401 without flows', { data: { status: 401, meta: { is_authenticated: false } } }],
  ])('rejects %s', (_label, error) => {
    expect(isAllAuthError(error)).toBe(false)
  })
})

// ── handleError ───────────────────────────────────────────────────────

describe('handleError', () => {
  describe('validation failures', () => {
    // A malformed REQUEST and a drifted RESPONSE both arrive as a 4xx
    // HTTP error carrying validation issues, and they are opposites: in
    // the 48h to 2026-09-08 every inbound one came from a bot, while the
    // one drifted response (`weightInfo`) broke add-to-cart for every
    // zero-weight product.
    it('files a malformed request as one warning naming route, field and rule, never the value, and rethrows it', () => {
      const original = inboundValidationError()

      const thrown = thrownBy(() => handleError(probe(), original))

      expect(thrown).toBe(original)
      expect(log.warn).toHaveBeenCalledTimes(1)
      expect(log.warn).toHaveBeenCalledWith({
        action: 'validation:request',
        method: 'GET',
        route: '/api/blog/posts',
        issues: [{ path: 'page', code: 'invalid_format', message: INBOUND_ISSUE.message }],
      })
      expect(JSON.stringify(log.warn.mock.calls)).not.toContain('gravitysmtp-settings')
      expect(log.error).not.toHaveBeenCalled()
    })

    it('recognises what nuxt/server\'s getValidatedQuery really throws', async () => {
      const event = probe()
      const original = await rejectionOf(getValidatedQuery(event, z.object({ page: z.string().regex(/^-?\d+$/) })), Error)

      const thrown = thrownBy(() => handleError(event, original))

      expect(thrown).toBe(original)
      expect(thrown.status).toBe(400)
      expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'validation:request',
        issues: [expect.objectContaining({ path: 'page', code: 'invalid_format' })],
      }))
    })

    it('keeps a drifted response at error level and rethrows its 422', async () => {
      const drifted = await responseContractError()

      const thrown = thrownBy(() => handleError(probe(), drifted))

      expect(thrown).toBe(drifted)
      expect(thrown.status).toBe(422)
      expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'validation:response', issues: [expect.objectContaining({ path: 'weightInfo' })] }))
      expect(log.warn).not.toHaveBeenCalled()
    })

    it('answers a bare ZodError (a hand-rolled parse) as 400 "Validation error" with its issues, logged at error', () => {
      const zod = new ZodError([INBOUND_ISSUE])

      const thrown = thrownBy(() => handleError(probe(), zod))

      expect(thrown.status).toBe(400)
      expect(thrown.statusText).toBe('Validation error')
      expect(thrown.data).toEqual({ issues: zod.issues })
      expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'validation:response' }))
    })

    it('survives a symbol in the issue path (Array#join would throw on it)', () => {
      thrownBy(() => handleError(probe(), inboundValidationError([Symbol('weird'), 'page'])))

      expect(log.warn.mock.calls[0]![0]).toMatchObject({ issues: [{ path: 'Symbol(weird).page' }] })
    })
  })

  describe('upstream (FetchError)', () => {
    it.each([
      [400, { phone: ['Enter a valid phone number.'] }],
      [429, { detail: 'Request was throttled.' }],
    ])('forwards a %i with its body, logged as a warning', async (status, body) => {
      const error = await upstreamError(status, body)

      const thrown = thrownBy(() => handleError(probe(), error))

      expect(thrown.status).toBe(status)
      expect(thrown.data).toEqual(body)
      expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ action: 'upstream:fetch' }))
      expect(log.error).not.toHaveBeenCalled()
    })

    it('drops a 5xx body, which can carry dependency diagnostics, and logs at error', async () => {
      const error = await upstreamError(502, { traceback: 'stripe.error.APIConnectionError at /srv/app' })

      const thrown = thrownBy(() => handleError(probe(), error))

      expect(thrown.status).toBe(502)
      expect(thrown.data).toBeUndefined()
      expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'upstream:fetch' }))
      expect(log.warn).not.toHaveBeenCalled()
    })

    it('answers a network failure (no status) as a 500 at error level, messaged from the error', async () => {
      backend.failOnce()
      const error = await rejectionOf($fetch('http://backend.test/api/v1/upstream', { method: 'POST' }), FetchError)

      const thrown = thrownBy(() => handleError(probe(), error))

      expect(thrown.status).toBe(500)
      expect(thrown.statusText).toBe(error.message)
      expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'upstream:fetch' }))
    })
  })

  describe('HTTP errors', () => {
    it.each([
      [404, 'warn'],
      [503, 'error'],
    ] as const)('rethrows a %i untouched, logged at %s', (status, level) => {
      const original = createError({ status, statusText: 'x' })

      expect(thrownBy(() => handleError(probe(), original))).toBe(original)
      expect(log[level]).toHaveBeenCalledWith(expect.objectContaining({ action: 'h3' }))
      expect(log[level === 'warn' ? 'error' : 'warn']).not.toHaveBeenCalled()
    })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'boom'],
    ['a number', 404],
    ['a plain Error', new Error('boom')],
  ])('answers anything else (%s) as a bare 500', (_label, error) => {
    const thrown = thrownBy(() => handleError(probe(), error))

    expect(thrown.status).toBe(500)
    expect(thrown.statusText).toBe('Internal Server Error')
    expect(thrown.data).toBeUndefined()
  })
})

// ── Route-level helpers: they set the response status ────────────────

/** A route that calls the backend and hands the failure to `onError`. */
function routeCatching(onError: (event: RequestEvent, error: unknown) => unknown, prelude?: (event: RequestEvent) => void) {
  return defineEventHandler(async (event) => {
    prelude?.(event)
    try {
      return await $fetch('http://backend.test/api/v1/upstream', { method: 'POST' })
    }
    catch (error) {
      return await onError(event, error)
    }
  })
}

describe('forwardUpstreamClientError', () => {
  it('returns an upstream 4xx body verbatim with its status (thrown data is stripped in production)', async () => {
    backend.replyOnce(jsonResponse({ phone: ['Enter a valid phone number.'] }, 400))

    const response = await callRoute(routeCatching(forwardUpstreamClientError), { method: 'POST', url: '/api/x' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ phone: ['Enter a valid phone number.'] })
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ action: 'upstream:fetch', data: { phone: ['Enter a valid phone number.'] } }))
  })

  it('throws through handleError when the 4xx has no body', async () => {
    backend.replyOnce(new Response(null, { status: 404, statusText: 'Not Found' }))

    const response = await callRoute(routeCatching(forwardUpstreamClientError), { method: 'POST', url: '/api/x' })

    expect(response.status).toBe(404)
    // handleError's message, not h3's "Cannot find any route" for an empty return.
    expect(response.error?.statusMessage).toBe('Not Found')
  })

  it('throws a 5xx through handleError, body dropped', async () => {
    backend.replyOnce(jsonResponse({ traceback: 'internal' }, 500))

    const response = await callRoute(routeCatching(forwardUpstreamClientError), { method: 'POST', url: '/api/x' })

    expect(response.status).toBe(500)
    expect(response.body.data).toBeUndefined()
  })
})

describe('handleAllAuthError', () => {
  const stored = { user: { id: 1 }, secure: { sessionToken: 'stored-session', accessToken: 'stored-access' } }
  const stampTokens = (event: RequestEvent) => {
    event.res.headers.set('X-Session-Token', 'leak')
    event.res.headers.set('Authorization', 'Bearer leak')
  }

  it('stores the new session token of a pending flow, keeping the stored access token, then throws', async () => {
    testSession.set(stored)
    backend.replyOnce(jsonResponse(allauth.pendingMfa({ session_token: 'next-step' }), 401))

    const response = await callRoute(routeCatching(handleAllAuthError, stampTokens), { method: 'POST', url: '/api/_allauth/login' })

    expect(response.status).toBe(401)
    expect(testSession.data.secure).toEqual({ sessionToken: 'next-step', accessToken: 'stored-access' })
    expect(testSession.data.user).toEqual({ id: 1 })
  })

  it('stores a new access token alone, keeping the stored session token', async () => {
    testSession.set(stored)
    backend.replyOnce(jsonResponse(allauth.pendingMfa({ access_token: 'new-access' }), 401))

    await callRoute(routeCatching(handleAllAuthError), { method: 'POST', url: '/api/_allauth/login' })

    expect(testSession.data.secure).toEqual({ sessionToken: 'stored-session', accessToken: 'new-access' })
  })

  it('keeps the stored session token when the 401 carries none (mid-2FA: clearing it broke the next step)', async () => {
    testSession.set(stored)
    backend.replyOnce(jsonResponse(allauth.pendingMfa(), 401))

    await callRoute(routeCatching(handleAllAuthError), { method: 'POST', url: '/api/_allauth/login' })

    expect(testSession.data).toEqual(stored)
  })

  it('clears the whole session on 410 (session expired)', async () => {
    testSession.set(stored)
    backend.replyOnce(jsonResponse(allauth.expired, 410))

    const response = await callRoute(routeCatching(handleAllAuthError), { method: 'POST', url: '/api/_allauth/session' })

    expect(response.status).toBe(410)
    expect(testSession.data).toEqual({})
  })

  it('strips the forwarding headers from the response', async () => {
    backend.replyOnce(jsonResponse(allauth.bad, 400))

    const response = await callRoute(routeCatching(handleAllAuthError, stampTokens), { method: 'POST', url: '/api/_allauth/login' })

    expect(response.headers.has('x-session-token')).toBe(false)
    expect(response.headers.has('authorization')).toBe(false)
  })

  it('leaves the session alone and reports a non-allauth failure, then throws it', async () => {
    testSession.set(stored)
    backend.replyOnce(jsonResponse({ detail: 'Server Error' }, 500))

    const response = await callRoute(routeCatching(handleAllAuthError, stampTokens), { method: 'POST', url: '/api/_allauth/login' })

    expect(response.status).toBe(500)
    expect(testSession.data).toEqual(stored)
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth:unexpected' }))
  })
})

describe('forwardAllAuthFlow', () => {
  it.each([
    ['400', allauth.bad, 400, 'Bad Request'],
    ['401 with a pending flow', allauth.pendingMfa(), 401, 'Unauthorized'],
    ['403', allauth.forbidden, 403, 'Forbidden'],
    ['404', allauth.notFound, 404, 'Not Found'],
    ['409', allauth.conflict, 409, 'Conflict'],
    ['410', allauth.expired, 410, 'Gone'],
  ])('returns an allauth %s as the body the client reads, with its status', async (_label, payload, status, text) => {
    backend.replyOnce(jsonResponse(payload, status))

    const response = await callRoute(routeCatching(forwardAllAuthFlow), { method: 'POST', url: '/api/_allauth/login' })

    expect(response.status).toBe(status)
    expect(response.error).toBeUndefined()
    // The client reads `error.data.data === payload`.
    expect(response.body).toEqual({ statusCode: status, statusMessage: text, data: payload })
  })

  it('reconciles the session before forwarding', async () => {
    testSession.set({ secure: { sessionToken: 'old' } })
    backend.replyOnce(jsonResponse(allauth.pendingMfa({ session_token: 'new' }), 401))

    await callRoute(routeCatching(forwardAllAuthFlow), { method: 'POST', url: '/api/_allauth/login' })

    expect(testSession.data.secure.sessionToken).toBe('new')
  })

  it('throws a 401 WITHOUT a pending flow instead of forwarding it (a spurious LOGGED_OUT otherwise)', async () => {
    backend.replyOnce(jsonResponse(allauth.notSignedIn, 401))

    const response = await callRoute(routeCatching(forwardAllAuthFlow), { method: 'POST', url: '/api/_allauth/password/reset' })

    expect(response.status).toBe(401)
    expect(response.error).toBeInstanceOf(H3Error)
  })

  it('throws anything that is not an allauth 4xx', async () => {
    backend.replyOnce(jsonResponse({ detail: 'boom' }, 502))

    const response = await callRoute(routeCatching(forwardAllAuthFlow), { method: 'POST', url: '/api/_allauth/login' })

    expect(response.status).toBe(502)
    expect(response.error).toBeInstanceOf(H3Error)
  })
})
