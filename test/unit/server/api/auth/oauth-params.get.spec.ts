import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/auth/oauth-params.get'
import { callRoute, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/auth/oauth-params: hands the OAuth callback's params (stored
 * in the encrypted session by the provider route, never put in a URL) to
 * the page exactly once.
 */

const route = '/api/auth/oauth-params'
const oauthParams = { provider: 'google', process: 'login', sessionToken: 'sess-oauth' }

describe('GET /api/auth/oauth-params', () => {
  it('returns the stored params and removes them, keeping the rest of the session', async () => {
    testSession.set({ user: { id: 5 }, secure: { accessToken: 'knox-1', oauthParams } })

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(oauthParams)
    expect(testSession.data.secure).toEqual({ accessToken: 'knox-1' })
    expect(testSession.data.user).toEqual({ id: 5 })
  })

  it('answers 404 the second time', async () => {
    testSession.set({ secure: { oauthParams } })

    await callRoute(handler, { route })
    const again = await callRoute(handler, { route })

    expect(again.status).toBe(404)
  })
})
