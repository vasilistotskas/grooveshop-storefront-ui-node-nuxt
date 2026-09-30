import { H3Error } from 'h3'
import { describe, expect, it } from 'vitest'
import {
  createHeaders,
  fetchUserData,
  getAllAuthAccessToken,
  getAllAuthHeaders,
  getAllAuthSessionToken,
  processAllAuthSession,
  requestHasSession,
  requireAllAuthAccessToken,
} from '~~/server/utils/auth'
import { backend, createTestEvent, jsonResponse, setRuntimeConfig, testSession, withEvent } from '~~/test/helpers/nitro'
import type { TestRequest } from '~~/test/helpers/nitro'
import { ZodAllAuthResponse } from '~~/shared/schemas/response/all-auth/response'
import type { AllAuthResponse } from '~~/shared/types/response/all-auth/response'

/** Run `fn` inside a request to shop.test (see `createTestEvent`). */
function inRequest<T>(fn: () => T, req: TestRequest = {}): T {
  return withEvent(createTestEvent(req), fn)
}

/** A `UserDetails` as Django serialises it (parsed by the real `zUserDetails` below). */
function userDetails(overrides: Record<string, unknown> = {}) {
  return {
    pk: 7,
    id: 7,
    email: 'maria@example.test',
    firstName: 'Maria',
    username: 'maria',
    twitter: null,
    linkedin: null,
    facebook: null,
    instagram: null,
    website: null,
    youtube: null,
    github: null,
    isActive: true,
    isStaff: false,
    isSuperuser: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    uuid: '00000000-0000-4000-8000-000000000007',
    mainImagePath: '',
    ...overrides,
  }
}

/** The allauth login success `processAllAuthSession` receives, parsed by the real `ZodAllAuthResponse`. */
function loginResponse(meta: NonNullable<AllAuthResponse['meta']>): AllAuthResponse {
  return ZodAllAuthResponse.parse({
    status: 200,
    data: { user: { id: 7, display: 'maria' }, methods: [] },
    meta,
  })
}

describe('createHeaders', () => {
  it('sends JSON, the request host, the page locale and no credentials by default', () => {
    const headers = inRequest(() => createHeaders(), { context: { locale: 'en' } })

    expect(headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Forwarded-Host': 'shop.test',
      'X-Language': 'en',
    })
    expect(headers).not.toHaveProperty('X-Session-Token')
    expect(headers).not.toHaveProperty('Authorization')
  })

  it('falls back to the default locale when the request has none', () => {
    expect(inRequest(() => createHeaders())['X-Language']).toBe('el')
  })

  it('forwards the request host, never a spoofed X-Forwarded-Host', () => {
    const headers = inRequest(() => createHeaders(), { host: 'webside.gr', headers: { 'x-forwarded-host': 'evil.example' } })

    expect(headers['X-Forwarded-Host']).toBe('webside.gr')
  })

  it('sends the session token and the access token when given', () => {
    const headers = inRequest(() => createHeaders('session-1', 'knox-1'))

    expect(headers['X-Session-Token']).toBe('session-1')
    expect(headers['Authorization']).toBe('Bearer knox-1')
  })

  it.each([['empty', ''], ['null', null], ['undefined', undefined]])('omits %s tokens', (_label, token) => {
    const headers = inRequest(() => createHeaders(token, token))

    expect(headers).not.toHaveProperty('X-Session-Token')
    expect(headers).not.toHaveProperty('Authorization')
  })

  it('merges in who the visitor is (clientIdentityHeaders)', () => {
    const headers = inRequest(() => createHeaders(), { headers: { 'user-agent': 'UA/1', 'cf-connecting-ip': '203.0.113.9' } })

    expect(headers).toMatchObject({ 'User-Agent': 'UA/1', 'X-Real-IP': '203.0.113.9' })
  })

  /**
   * `apiBaseUrl` is the in-cluster Service over plain HTTP, so a call
   * without `X-Forwarded-Proto: https` gets a 301 to the public host and
   * ofetch follows it out of the cluster (a basic-auth 401 on staging, a
   * Nuxt 404 in production). The header comes from the site's public
   * scheme whenever the request itself is not https.
   */
  it.each([
    ['an https request', { 'x-forwarded-proto': 'https' }, 'http://localhost:3000', 'https'],
    ['an http request on an https site', {}, 'https://platform.test', 'https'],
    ['an http request on a local http site', {}, 'http://localhost:3000', 'http'],
  ])('sends X-Forwarded-Proto for %s', (_label, requestHeaders, baseUrl, expected) => {
    setRuntimeConfig({ public: { baseUrl } })

    expect(inRequest(() => createHeaders(), { headers: requestHeaders })['X-Forwarded-Proto']).toBe(expected)
  })
})

describe('requestHasSession', () => {
  // Reading a session on a request that has none MINTS one and sets a
  // cookie (h3 getSession), which put `nuxt-session` on every anonymous
  // page and kept every page out of the edge cache. It looks where h3
  // looks: header first, then cookie.
  it('is false for a request with neither the cookie nor the header, and sets no cookie', () => {
    const event = createTestEvent()

    expect(requestHasSession(event)).toBe(false)
    expect(event.node.res.getHeader('set-cookie')).toBeUndefined()
  })

  it('finds the session cookie named in runtimeConfig.session', () => {
    expect(requestHasSession(createTestEvent({ headers: { cookie: 'nuxt-session=Fe26.2**sealed' } }))).toBe(true)
  })

  it('finds the header h3 derives from the session name (x-<name>-session)', () => {
    expect(requestHasSession(createTestEvent({ headers: { 'x-nuxt-session-session': 'Fe26.2**sealed' } }))).toBe(true)
  })

  it('honours a custom session header', () => {
    setRuntimeConfig({ session: { sessionHeader: 'x-custom' } })

    expect(requestHasSession(createTestEvent({ headers: { 'x-custom': 'Fe26.2**sealed' } }))).toBe(true)
    expect(requestHasSession(createTestEvent({ headers: { 'x-nuxt-session-session': 'Fe26.2**sealed' } }))).toBe(false)
  })

  it('ignores headers when sessionHeader is false, as h3 does', () => {
    setRuntimeConfig({ session: { sessionHeader: false } })

    expect(requestHasSession(createTestEvent({ headers: { 'x-nuxt-session-session': 'Fe26.2**sealed' } }))).toBe(false)
  })

  it('fails loudly when the session is not configured, rather than guessing a name', () => {
    setRuntimeConfig({ session: { name: '' } })

    expect(() => requestHasSession(createTestEvent())).toThrow('runtimeConfig.session.name is not set')
  })
})

describe('session token readers', () => {
  it('read the tokens from the encrypted session', async () => {
    testSession.set({ secure: { sessionToken: 'session-1', accessToken: 'knox-1' } })

    await expect(inRequest(() => getAllAuthSessionToken())).resolves.toBe('session-1')
    await expect(inRequest(() => getAllAuthAccessToken())).resolves.toBe('knox-1')
  })

  it('read undefined from an anonymous session', async () => {
    await expect(inRequest(() => getAllAuthSessionToken())).resolves.toBeUndefined()
    await expect(inRequest(() => getAllAuthAccessToken())).resolves.toBeUndefined()
  })

  it('getAllAuthAccessToken takes an explicit event outside a bound request', async () => {
    testSession.set({ secure: { accessToken: 'knox-1' } })

    await expect(getAllAuthAccessToken(createTestEvent())).resolves.toBe('knox-1')
  })

  it('getAllAuthHeaders is createHeaders with the stored tokens', async () => {
    testSession.set({ secure: { sessionToken: 'session-1', accessToken: 'knox-1' } })

    const headers = await inRequest(() => getAllAuthHeaders())

    expect(headers).toMatchObject({ 'X-Session-Token': 'session-1', 'Authorization': 'Bearer knox-1', 'X-Forwarded-Host': 'shop.test' })
  })
})

describe('requireAllAuthAccessToken', () => {
  it('returns the access token of a signed-in session', async () => {
    testSession.set({ user: { id: 7 }, secure: { accessToken: 'knox-1' } })

    await expect(inRequest(() => requireAllAuthAccessToken())).resolves.toBe('knox-1')
  })

  it('rejects an anonymous session with 401', async () => {
    await expect(inRequest(() => requireAllAuthAccessToken())).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rejects a signed-in session without an access token with 401 "Access token required"', async () => {
    testSession.set({ user: { id: 7 }, secure: { sessionToken: 'session-1' } })

    const error = await inRequest(() => requireAllAuthAccessToken()).catch((caught: H3Error) => caught)

    expect(error).toBeInstanceOf(H3Error)
    expect(error).toMatchObject({ statusCode: 401, statusMessage: 'Access token required' })
  })
})

describe('processAllAuthSession', () => {
  const PENDING = { status: 200 as const, data: {}, meta: {} }

  it('stores the tokens allauth returned, keeping the rest of the session', async () => {
    testSession.set({ oauthState: 'x', secure: { sessionToken: 'old', accessToken: 'old-knox' } })

    await inRequest(() => processAllAuthSession({ ...PENDING, meta: { session_token: 'new', access_token: 'new-knox' } }))

    expect(testSession.data).toEqual({ oauthState: 'x', secure: { sessionToken: 'new', accessToken: 'new-knox' } })
  })

  it('falls back to the tokens the caller passed, then to the stored ones', async () => {
    testSession.set({ secure: { sessionToken: 'stored', accessToken: 'stored-knox' } })

    await inRequest(() => processAllAuthSession(PENDING, 'passed-knox', null))

    expect(testSession.data.secure).toEqual({ sessionToken: 'stored', accessToken: 'passed-knox' })
  })

  it('leaves the session untouched when there is no token anywhere', async () => {
    testSession.set({ keep: true })

    await inRequest(() => processAllAuthSession(PENDING))

    expect(testSession.data).toEqual({ keep: true })
    expect(backend.requests).toEqual([])
  })

  it('loads the user once login returns an access token', async () => {
    backend.reply(userDetails())

    await inRequest(() => processAllAuthSession(loginResponse({ access_token: 'knox-1', session_token: 's' })))

    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/user/account/7')
    expect(testSession.data.user).toMatchObject({ id: 7, email: 'maria@example.test' })
  })

  it('loads the user for an authenticated session without a new token', async () => {
    testSession.set({ secure: { sessionToken: 'session-1' } })
    backend.reply(userDetails())

    await inRequest(() => processAllAuthSession(loginResponse({ is_authenticated: true })))

    expect(testSession.data.user).toMatchObject({ id: 7 })
  })

  it('does not load a user for an unauthenticated response', async () => {
    await inRequest(() => processAllAuthSession(loginResponse({ is_authenticated: false, session_token: 's' })))

    expect(backend.requests).toEqual([])
  })
})

describe('fetchUserData', () => {
  it('asks for the user as the tenant with the Knox token, and replaces the session user', async () => {
    testSession.set({ user: { id: 7, staleField: 'old' }, secure: { sessionToken: 's', accessToken: 'knox-1' } })
    backend.reply(userDetails())

    const user = await inRequest(
      () => fetchUserData(loginResponse({ access_token: 'knox-1' })),
      { host: 'webside.gr', headers: { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'https' }, context: { locale: 'en' } },
    )

    const request = backend.lastRequest
    expect(request.method).toBe('GET')
    expect(request.headers.get('authorization')).toBe('Bearer knox-1')
    expect(request.headers.get('x-forwarded-host')).toBe('webside.gr')
    expect(request.headers.get('x-forwarded-proto')).toBe('https')
    expect(request.headers.get('x-language')).toBe('en')
    expect(user).toMatchObject({ id: 7, email: 'maria@example.test' })
    // replaceUserSession, not a merge: the stale key is gone, `secure` carried over.
    expect(testSession.data.user).not.toHaveProperty('staleField')
    expect(testSession.data.secure).toEqual({ sessionToken: 's', accessToken: 'knox-1' })
  })

  it('prefers the token the caller passes over the one in meta', async () => {
    backend.reply(userDetails())

    await inRequest(() => fetchUserData(loginResponse({ access_token: 'meta-knox' }), 'passed-knox'))

    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer passed-knox')
  })

  it('uses the stored session headers for an authenticated response without any token', async () => {
    testSession.set({ secure: { sessionToken: 'session-1' } })
    backend.reply(userDetails())

    await inRequest(() => fetchUserData(loginResponse({ is_authenticated: true })))

    expect(backend.lastRequest.headers.get('x-session-token')).toBe('session-1')
    expect(backend.lastRequest.headers.has('authorization')).toBe(false)
  })

  it('rejects a user payload that drifted from zUserDetails and leaves the session alone', async () => {
    testSession.set({ user: { id: 7 } })
    backend.reply(userDetails({ email: 'not-an-email' }))

    await expect(inRequest(() => fetchUserData(loginResponse({ access_token: 'k' })))).rejects.toMatchObject({ statusCode: 422 })
    expect(testSession.data).toEqual({ user: { id: 7 } })
  })

  it('lets an upstream failure through', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    await expect(inRequest(() => fetchUserData(loginResponse({ access_token: 'k' })))).rejects.toMatchObject({ statusCode: 404 })
  })
})
