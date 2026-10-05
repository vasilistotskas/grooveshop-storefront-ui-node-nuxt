import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/account/email/index.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/_allauth/app/v1/account/email. Besides adding an address for a
 * signed-in account, allauth answers it for a visitor whose sign-up is
 * waiting on an emailed code (`ManageEmailView` with a pending
 * `EmailVerificationProcess`): only the pending session token, no Knox
 * token, and the pending address is changed and mailed a fresh code. That
 * answer is a 200 with the address list, the same as for an add; a spent
 * allowance is a 409 with `{status: 409}`.
 */

const route = '/api/_allauth/app/v1/account/email'

const change = (email = 'right@example.com') =>
  callRoute(handler, { route, method: 'POST', body: { email } })

describe('POST /api/_allauth/app/v1/account/email, mid-verification', () => {
  it('sends the corrected address with only the pending session token and returns the address list', async () => {
    testSession.set({ secure: { sessionToken: 'pending-1' } })
    const list = [{ email: 'right@example.com', verified: false, primary: true }]
    backend.reply({ status: 200, data: list })

    const response = await change()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 200, data: list })
    const sent = backend.lastRequest
    expect(sent.method).toBe('POST')
    expect(sent.path).toBe('http://backend.test/_allauth/app/v1/account/email')
    expect(sent.body).toEqual({ email: 'right@example.com' })
    expect(sent.headers.get('x-session-token')).toBe('pending-1')
    expect(sent.headers.get('authorization')).toBeNull()
  })

  it('accepts an empty list, which is what allauth may answer for a pending address', async () => {
    testSession.set({ secure: { sessionToken: 'pending-1' } })
    backend.reply({ status: 200, data: [] })

    const response = await change()

    expect(response.status).toBe(200)
  })

  it('returns the 409 with its status once the allowed changes are spent', async () => {
    backend.reply(jsonResponse({ status: 409 }, 409))

    const response = await change()

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ statusCode: 409, statusMessage: 'Conflict', data: { status: 409 } })
  })

  it('rejects a body that is not an email before calling allauth', async () => {
    const response = await change('nope')

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
