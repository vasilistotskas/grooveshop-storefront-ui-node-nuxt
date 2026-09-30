import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/config.get'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/_allauth/app/v1/config: allauth's public configuration, which
 * every page needs to render its sign-in options. An expired session
 * (410) must not take it down: the stale session is dropped and the
 * config fetched again anonymously.
 */

const route = '/api/_allauth/app/v1/config'
const CONFIG_URL = 'http://backend.test/_allauth/app/v1/config'

const configResponse = {
  status: 200,
  data: {
    account: { authentication_method: 'email', is_open_for_signup: true },
    socialaccount: { providers: [] },
    mfa: { supported_types: ['totp', 'webauthn'] },
    usersessions: { track_activity: false },
  },
}

const expired = jsonResponse({ status: 410, data: { flows: [] }, meta: { is_authenticated: false } }, 410)

describe('GET /api/_allauth/app/v1/config', () => {
  it('fetches the config with the visitor\'s session', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1' } })
    backend.reply(configResponse)

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(configResponse)
    expect(backend.lastRequest.path).toBe(CONFIG_URL)
    expect(backend.lastRequest.headers.get('x-session-token')).toBe('sess-1')
  })

  it('drops an expired session and retries anonymously', async () => {
    testSession.set({ secure: { sessionToken: 'sess-expired' }, user: { id: 5 } })
    backend.replyOnce(expired)
    backend.replyOnce(configResponse)

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(configResponse)
    expect(testSession.data).toEqual({})
    const [first, retry] = backend.requests
    expect(first!.headers.get('x-session-token')).toBe('sess-expired')
    expect(retry!.path).toBe(CONFIG_URL)
    expect(retry!.headers.has('x-session-token')).toBe(false)
  })

  it('fails with the upstream status for any other error', async () => {
    backend.reply(jsonResponse({ status: 403, errors: [] }, 403))

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(403)
    expect(backend.requests).toHaveLength(1)
  })
})
