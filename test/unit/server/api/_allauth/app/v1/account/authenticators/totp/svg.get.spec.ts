import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/account/authenticators/totp/svg.get'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/_allauth/app/v1/account/authenticators/totp/svg: the authenticator
 * app's status and what to enrol one with. For a shopper who has one allauth
 * answers 200 with the authenticator (the deactivation page reads that); for
 * one who has none, Django's own view answers 404 with the secret and the QR
 * code, which is returned as the answer the setup page reads.
 */

const route = '/api/_allauth/app/v1/account/authenticators/totp/svg'

const status = () => callRoute(handler, { route })

describe('GET /api/_allauth/app/v1/account/authenticators/totp/svg', () => {
  it('answers the authenticator a shopper has, with their session', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1' } })
    const body = { status: 200, data: { type: 'totp', created_at: 1_700_000_000, last_used_at: null } }
    backend.reply(body)

    const response = await status()

    expect(response.status).toBe(200)
    expect(response.body).toEqual(body)
    expect(backend.lastRequest.headers.get('x-session-token')).toBe('sess-1')
  })

  it('returns what to enrol with when the shopper has none', async () => {
    const setup = { status: 404, meta: { secret: 'JBSWY3DPEHPK3PXP', totp_url: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP', totp_svg: '<svg/>' } }
    backend.reply(jsonResponse(setup, 404))

    const response = await status()

    expect(response.status).toBe(200)
    expect(response.body).toEqual(setup)
  })
})
