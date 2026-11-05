import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/auth/webauthn/signup.get'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

/**
 * GET /api/_allauth/app/v1/auth/webauthn/signup: the options a passkey signup
 * registers a credential with. allauth answers `creation_options`, unlike the
 * `request_options` of a passkey sign-in; a parser that wanted those answered
 * 422 to every shopper who chose a passkey.
 */

const route = '/api/_allauth/app/v1/auth/webauthn/signup'

/** The body allauth serves, as Django's contract test reads it. */
const creationOptions = {
  status: 200,
  data: {
    creation_options: {
      publicKey: {
        challenge: 'c2lnbnVw',
        rp: { id: 'demo.grooveshop.space', name: 'Demo' },
        user: { id: 'MQ', name: 'shopper@example.com', displayName: 'shopper@example.com' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        excludeCredentials: [],
        authenticatorSelection: { residentKey: 'required', userVerification: 'required', requireResidentKey: true },
        extensions: { credProps: true },
      },
    },
  },
  meta: { is_authenticated: false },
}

describe('GET /api/_allauth/app/v1/auth/webauthn/signup', () => {
  it('passes on the creation options allauth serves', async () => {
    backend.reply(jsonResponse(creationOptions))

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ data: { creation_options: { publicKey: { challenge: 'c2lnbnVw' } } } })
  })

  it('forwards the conflict of a signup with no passkey step pending', async () => {
    backend.reply(jsonResponse({ status: 409 }, 409))

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(409)
  })
})
