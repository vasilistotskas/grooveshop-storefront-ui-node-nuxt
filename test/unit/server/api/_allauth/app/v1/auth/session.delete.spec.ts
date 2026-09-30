import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/auth/session.delete'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * DELETE /api/_allauth/app/v1/auth/session: logout. Its `finally` is the
 * contract — the user session AND the cart session are torn down however
 * allauth answered, or a signed-out visitor keeps a cart bound to the
 * account on a shared device.
 */

const route = '/api/_allauth/app/v1/auth/session'
const CART_UUID = '6f1c1d8e-2a4b-4c3d-9e8f-0a1b2c3d4e5f'

const logout = () => callRoute(handler, {
  route,
  method: 'DELETE',
  headers: { cookie: `cart-id=${CART_UUID}` },
})

/** The cart's fallback cookie is expired on the response (the h3 `deleteCookie` shape). */
const cartCookieDeleted = (headers: Headers) =>
  headers.getSetCookie().some(cookie => /^cart-id=;/.test(cookie) && /Max-Age=0/i.test(cookie))

describe('DELETE /api/_allauth/app/v1/auth/session', () => {
  it('logs the session out at allauth with the stored tokens', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1', accessToken: 'knox-1' }, user: { id: 5 } })
    backend.reply({ status: 200 })

    const response = await logout()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 200 })
    const sent = backend.lastRequest
    expect(sent.method).toBe('DELETE')
    expect(sent.path).toBe('http://backend.test/_allauth/app/v1/auth/session')
    expect(sent.headers.get('x-session-token')).toBe('sess-1')
    expect(sent.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it.each([
    ['succeeds', () => backend.reply({ status: 200 }), 200],
    ['answers 401', () => backend.reply(jsonResponse({ status: 401, data: { flows: [] }, meta: { is_authenticated: false } }, 401)), 401],
    ['is unreachable', () => backend.failOnce(), 500],
  ])('clears the user and the cart session when allauth %s', async (_label, arrange, status) => {
    testSession.set({ secure: { sessionToken: 'sess-1', accessToken: 'knox-1' }, user: { id: 5 } })
    arrange()

    const response = await logout()

    expect(response.status).toBe(status)
    expect(testSession.data).toEqual({})
    expect(cartCookieDeleted(response.headers)).toBe(true)
  })
})
