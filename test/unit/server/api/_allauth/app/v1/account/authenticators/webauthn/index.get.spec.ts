import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/account/authenticators/webauthn/index.get'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/_allauth/app/v1/account/authenticators/webauthn: the creation
 * options for a new key. allauth asks for a passkey (passwordless) when
 * the `passwordless` parameter is present at all, whatever its value, so
 * the route forwards it only for a passkey.
 */

const route = '/api/_allauth/app/v1/account/authenticators/webauthn'

const loggedOut = jsonResponse({
  status: 401,
  data: { flows: [{ id: 'login' }] },
  meta: { is_authenticated: false },
}, 401)

const options = (query: string) =>
  callRoute(handler, { route, url: `${route}${query}`, method: 'GET' })

describe('GET /api/_allauth/app/v1/account/authenticators/webauthn', () => {
  it('asks allauth for a passkey when passwordless is true', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1', accessToken: 'knox-1' } })
    backend.reply(loggedOut)

    await options('?passwordless=true')

    expect(backend.lastRequest.query).toEqual({ passwordless: '' })
  })

  it('sends no passwordless parameter for a security key', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1', accessToken: 'knox-1' } })
    backend.reply(loggedOut)

    await options('?passwordless=false')

    expect(backend.lastRequest.query).toEqual({})
  })

  it('sends no passwordless parameter when none is given', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1', accessToken: 'knox-1' } })
    backend.reply(loggedOut)

    await options('')

    expect(backend.lastRequest.query).toEqual({})
  })

  it('rejects a value that is not true or false before calling allauth', async () => {
    const response = await options('?passwordless=yes')

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
