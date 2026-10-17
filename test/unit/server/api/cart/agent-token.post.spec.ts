/**
 * POST /api/cart/agent-token: the signed-in shopper's session trades its
 * Knox token for the short-lived cart token the shopping assistant acts
 * with. Only the token and its lifetime reach the browser.
 */
import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/cart/agent-token.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

const route = '/api/cart/agent-token'

const mint = () => callRoute(handler, { route, url: route, method: 'POST' })

describe('POST /api/cart/agent-token', () => {
  it('asks Django for the token with the shopper\'s access token and returns it', async () => {
    testSession.set({ user: { id: 6 }, secure: { accessToken: 'knox-1' } })
    backend.reply({ token: 'cart-token-1', expiresIn: 1800 })

    const response = await mint()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ token: 'cart-token-1', expiresIn: 1800 })
    expect(backend.lastRequest.method).toBe('POST')
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/cart/agent-token')
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('exposes nothing beyond the token and its lifetime', async () => {
    testSession.set({ user: { id: 6 }, secure: { accessToken: 'knox-1' } })
    backend.reply({ token: 'cart-token-1', expiresIn: 1800, cartId: 'c', user: 7 })

    const response = await mint()

    expect(response.body).toEqual({ token: 'cart-token-1', expiresIn: 1800 })
  })

  it('refuses a visitor without a session before calling Django', async () => {
    const response = await mint()

    expect(response.status).toBe(401)
    expect(backend.requests).toEqual([])
  })

  it('passes on Django\'s refusal', async () => {
    testSession.set({ user: { id: 6 }, secure: { accessToken: 'knox-1' } })
    backend.reply(jsonResponse({ detail: 'Invalid token.' }, 401))

    const response = await mint()

    expect(response.status).toBe(401)
  })
})
