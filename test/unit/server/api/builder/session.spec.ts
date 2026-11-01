import { describe, expect, it, vi } from 'vitest'
import deleteHandler from '~~/server/api/builder/session.delete'
import getHandler from '~~/server/api/builder/session.get'
import postHandler from '~~/server/api/builder/session.post'
import { requireBuilderStaff } from '~~/server/utils/builderSession'
import { BUILDER_SESSION_COOKIE } from '~~/shared/constants/builderSession'
import { backend, callRoute, createRequestEvent, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/builder/session'

const staff = { id: 7, name: 'Maria Papadopoulou', role: 'ADMIN' }
const expiresIn = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString()
const staffSession = (overrides: Record<string, unknown> = {}) => ({
  token: 'knox-secret-token',
  expiresAt: expiresIn(3600),
  staff,
  ...overrides,
})

const post = (body: unknown = { ticket: 'one-time-ticket' }) => callRoute(postHandler, {
  route,
  method: 'POST',
  body,
  headers: { 'x-forwarded-host': 'evil.example' },
})

/** `name=value` of the cookie a response set, as a browser sends it back. */
function cookieOf(response: { headers: Headers }, name = BUILDER_SESSION_COOKIE): string | undefined {
  return response.headers.getSetCookie().find(cookie => cookie.startsWith(`${name}=`))?.split(';')[0]
}

/** The cookie a signed-in browser holds. */
async function signIn(session = staffSession()): Promise<string> {
  backend.reply(session)
  const cookie = cookieOf(await post())
  if (!cookie) throw new Error('sign-in set no cookie')
  return cookie
}

const get = (cookie?: string) => callRoute(getHandler, { route, headers: cookie ? { cookie } : {} })

describe('POST /api/builder/session', () => {
  it('exchanges the ticket with the store\'s backend, server to server', async () => {
    backend.reply(staffSession())

    await post()

    expect(backend.lastRequest).toMatchObject({
      path: 'http://backend.test/api/v1/builder/staff-session',
      method: 'POST',
      body: { ticket: 'one-time-ticket' },
    })
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('tells the browser who signed in and until when, and never the token', async () => {
    const session = staffSession()
    backend.reply(session)

    const response = await post()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ staff, expiresAt: session.expiresAt })
    expect(JSON.stringify(response.body)).not.toContain('knox-secret-token')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  describe('the cookie', () => {
    it('is the builder\'s own: sealed, HttpOnly, Secure, SameSite=Strict, for the whole host', async () => {
      backend.reply(staffSession())

      const response = await post()
      const header = response.headers.getSetCookie().find(cookie => cookie.startsWith(`${BUILDER_SESSION_COOKIE}=`))!

      expect(header).toMatch(/; Path=\/(;|$)/)
      expect(header).toContain('HttpOnly')
      expect(header).toContain('Secure')
      expect(header).toContain('SameSite=Strict')
      expect(header).not.toContain('Domain=')
      expect(header).not.toContain('knox-secret-token')
      expect(BUILDER_SESSION_COOKIE).toMatch(/^__Host-/)
    })

    it('lives as long as the token: its Max-Age is the time left to expiresAt', async () => {
      backend.reply(staffSession({ expiresAt: expiresIn(1800) }))

      const response = await post()
      const header = response.headers.getSetCookie().find(cookie => cookie.startsWith(`${BUILDER_SESSION_COOKIE}=`))!
      const maxAge = Number(/Max-Age=(\d+)/.exec(header)?.[1])

      expect(maxAge).toBeGreaterThan(1790)
      expect(maxAge).toBeLessThanOrEqual(1800)
    })

    it('leaves the customer session alone', async () => {
      backend.reply(staffSession())

      const response = await post()

      expect(cookieOf(response, 'nuxt-session')).toBeUndefined()
    })
  })

  it('answers a ticket Django refuses with its own 400 body, and sets no cookie', async () => {
    backend.reply(jsonResponse({ code: 'invalid_ticket' }, 400))

    const response = await post()

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ code: 'invalid_ticket' })
    expect(cookieOf(response)).toBeUndefined()
  })

  it.each([{}, { ticket: '' }, { ticket: 5 }, { ticket: 'x'.repeat(513) }, 'ticket'])('refuses the body %j before it asks Django', async (body) => {
    const response = await post(body)

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(0)
  })

  it('refuses an answer that is not a staff session instead of sealing it', async () => {
    backend.reply({ token: 'x', staff })

    const response = await post()

    expect(response.status).toBe(422)
    expect(cookieOf(response)).toBeUndefined()
  })

  it('refuses a token that is already expired', async () => {
    backend.reply(staffSession({ expiresAt: expiresIn(-5) }))

    const response = await post()

    expect(response.status).toBe(502)
    expect(cookieOf(response)).toBeUndefined()
  })
})

describe('GET /api/builder/session', () => {
  it('says who is signed in, from the cookie sign-in set, and never the token', async () => {
    const session = staffSession()
    const cookie = await signIn(session)

    const response = await get(cookie)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ staff, expiresAt: session.expiresAt })
    expect(JSON.stringify(response.body)).not.toContain('knox-secret-token')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('is a 401 for a request with no cookie, and does not mint one', async () => {
    const response = await get()

    expect(response.status).toBe(401)
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it('is a 401 for a customer session: that cookie is not this one', async () => {
    const response = await get('nuxt-session=sealed-customer-session')

    expect(response.status).toBe(401)
  })

  it.each([
    ['not a sealed value', `${BUILDER_SESSION_COOKIE}=garbage`],
    ['empty', `${BUILDER_SESSION_COOKIE}=`],
  ])('is a 401 for a cookie that is %s, and expires it', async (_, cookie) => {
    const response = await get(cookie)

    expect(response.status).toBe(401)
    expect(response.headers.getSetCookie().every(header => !header.startsWith(`${BUILDER_SESSION_COOKIE}=`) || /Max-Age=0/.test(header))).toBe(true)
  })

  it('is a 401 once the session has expired, and expires the cookie', async () => {
    const cookie = await signIn(staffSession({ expiresAt: expiresIn(60) }))
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(Date.now() + 120 * 1000) })

    const response = await get(cookie)
    vi.useRealTimers()

    expect(response.status).toBe(401)
    expect(response.headers.getSetCookie().find(header => header.startsWith(`${BUILDER_SESSION_COOKIE}=`))).toMatch(/Max-Age=0/)
  })
})

describe('DELETE /api/builder/session', () => {
  const del = (cookie?: string) => callRoute(deleteHandler, { route, method: 'DELETE', headers: cookie ? { cookie } : {} })
  const expired = (response: { headers: Headers }) =>
    response.headers.getSetCookie().find(header => header.startsWith(`${BUILDER_SESSION_COOKIE}=`))

  it('revokes the token at Django with the staff token as Bearer, expires the cookie and answers 204', async () => {
    const cookie = await signIn()
    backend.reply(new Response(null, { status: 204 }))

    const response = await del(cookie)

    expect(response.status).toBe(204)
    expect(backend.lastRequest).toMatchObject({ path: 'http://backend.test/api/v1/builder/staff-session', method: 'DELETE' })
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-secret-token')
    expect(expired(response)).toMatch(/Max-Age=0/)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it.each([401, 404])('treats a %s from Django as already revoked', async (status) => {
    const cookie = await signIn()
    backend.reply(jsonResponse({}, status))

    const response = await del(cookie)

    expect(response.status).toBe(204)
    expect(expired(response)).toMatch(/Max-Age=0/)
  })

  it('still expires the cookie when Django cannot be asked, and then fails the request', async () => {
    const cookie = await signIn()
    backend.reply(jsonResponse({}, 502))

    const response = await del(cookie)

    expect(response.status).toBe(502)
    expect(expired(response)).toMatch(/Max-Age=0/)
  })

  it('has nothing to revoke for a request that was never signed in: no call to Django, 204', async () => {
    const response = await del()

    expect(response.status).toBe(204)
    expect(backend.requests).toHaveLength(0)
  })
})

describe('requireBuilderStaff', () => {
  it('gives a route the staff member and the Authorization header that carries their token to Django', async () => {
    const session = staffSession()
    const cookie = await signIn(session)

    const result = await requireBuilderStaff(createRequestEvent({ headers: { cookie } }))

    expect(result).toEqual({
      staff,
      expiresAt: session.expiresAt,
      headers: { Authorization: 'Bearer knox-secret-token' },
    })
  })

  it('refuses a request without a staff session with a 401', async () => {
    await expect(requireBuilderStaff(createRequestEvent())).rejects.toMatchObject({ statusCode: 401 })
  })
})
