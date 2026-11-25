import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/auth/reauthenticate/code/request.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/_allauth/app/v1/auth/reauthenticate/code/request: asks allauth
 * to mail a re-authentication code to one of the signed-in shopper's
 * verified addresses. The answer is a bare acknowledgement; a refusal
 * (an address that is not theirs: 400, the method off: 403, too many: 429) is
 * returned with its status.
 */

const route = '/api/_allauth/app/v1/auth/reauthenticate/code/request'

const request = (body: unknown = { email: 'maria@example.com' }) => callRoute(handler, { route, method: 'POST', body })

describe('POST /api/_allauth/app/v1/auth/reauthenticate/code/request', () => {
  it('sends the address with the session token and answers allauth\'s acknowledgement', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1' } })
    backend.reply({ status: 200 })

    const response = await request()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 200 })
    const sent = backend.lastRequest
    expect(sent.method).toBe('POST')
    expect(sent.path).toBe('http://backend.test/_allauth/app/v1/auth/reauthenticate/code/request')
    expect(sent.headers.get('x-session-token')).toBe('sess-1')
    expect(sent.body).toEqual({ email: 'maria@example.com' })
  })

  it('refuses a body with no address before asking allauth', async () => {
    const response = await request({})

    expect(response.status).toBe(400)
    expect(backend.requests).toHaveLength(0)
  })

  it('returns allauth\'s 400 for an address that is not the shopper\'s', async () => {
    const refused = { status: 400, errors: [{ message: 'Unknown email.', code: 'unknown_email', param: 'email' }] }
    backend.reply(jsonResponse(refused, 400))

    const response = await request()

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ statusCode: 400, statusMessage: 'Bad Request', data: refused })
  })

  it('returns a 403 while the method is off', async () => {
    backend.reply(jsonResponse({ status: 403 }, 403))

    const response = await request()

    expect(response.status).toBe(403)
  })
})
