import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/auth/reauthenticate/code/confirm.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'
import { FIXTURE_EPOCH, makeSessionResponse } from '~~/test/fixtures/allauth'
import { makeUserDetails } from '~~/test/fixtures/user'

/**
 * POST /api/_allauth/app/v1/auth/reauthenticate/code/confirm: gives allauth
 * the code the shopper was mailed. A right one answers the signed-in session
 * (its methods now carry the reauthentication); a wrong one is a 400 and a
 * code nobody is waiting for a 409, both returned with their status.
 */

const route = '/api/_allauth/app/v1/auth/reauthenticate/code/confirm'

const confirm = (body: unknown = { code: '123456' }) => callRoute(handler, { route, method: 'POST', body })

describe('POST /api/_allauth/app/v1/auth/reauthenticate/code/confirm', () => {
  it('sends the code with the session token and stores a rotated one', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1' } })
    const reauthenticated = makeSessionResponse({
      methods: [{ method: 'code', at: FIXTURE_EPOCH, email: 'shopper@example.com', reauthenticated: true }],
    })
    // The session answer, then the account the session is rebuilt from.
    backend.replyOnce({ ...reauthenticated, meta: { is_authenticated: true, session_token: 'sess-2' } })
    backend.replyOnce(makeUserDetails({ id: 7, email: 'shopper@example.com' }))

    const response = await confirm()

    expect(response.status).toBe(200)
    const sent = backend.requests[0]!
    expect(sent.path).toBe('http://backend.test/_allauth/app/v1/auth/reauthenticate/code/confirm')
    expect(sent.headers.get('x-session-token')).toBe('sess-1')
    expect(sent.body).toEqual({ code: '123456' })
    expect(testSession.data.secure).toEqual(expect.objectContaining({ sessionToken: 'sess-2' }))
  })

  it('returns allauth\'s 400 for a wrong code', async () => {
    const refused = { status: 400, errors: [{ message: 'Incorrect code.', code: 'incorrect_code', param: 'code' }] }
    backend.reply(jsonResponse(refused, 400))

    const response = await confirm()

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ statusCode: 400, statusMessage: 'Bad Request', data: refused })
  })

  it('returns a 409 when no code is waiting', async () => {
    backend.reply(jsonResponse({ status: 409 }, 409))

    const response = await confirm()

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ statusCode: 409, statusMessage: 'Conflict', data: { status: 409 } })
  })
})
