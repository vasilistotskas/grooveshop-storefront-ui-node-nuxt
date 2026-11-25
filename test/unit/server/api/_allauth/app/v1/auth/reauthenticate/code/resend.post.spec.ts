import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/auth/reauthenticate/code/resend.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/_allauth/app/v1/auth/reauthenticate/code/resend: mails the
 * pending re-authentication code again. A 409 (nothing pending, or the
 * resend quota spent) and a 429 cooldown are returned with their status.
 */

const route = '/api/_allauth/app/v1/auth/reauthenticate/code/resend'

const resend = () => callRoute(handler, { route, method: 'POST' })

describe('POST /api/_allauth/app/v1/auth/reauthenticate/code/resend', () => {
  it('asks allauth to resend with the session token of the signed-in shopper', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1' } })
    backend.reply({ status: 200 })

    const response = await resend()

    expect(response.status).toBe(200)
    const sent = backend.lastRequest
    expect(sent.path).toBe('http://backend.test/_allauth/app/v1/auth/reauthenticate/code/resend')
    expect(sent.headers.get('x-session-token')).toBe('sess-1')
  })

  it('returns a 409 when there is nothing left to resend', async () => {
    backend.reply(jsonResponse({ status: 409 }, 409))

    const response = await resend()

    expect(response.status).toBe(409)
  })

  it('answers a cooldown with a 429', async () => {
    backend.reply(jsonResponse({ status: 429 }, 429))

    const response = await resend()

    expect(response.status).toBe(429)
  })
})
