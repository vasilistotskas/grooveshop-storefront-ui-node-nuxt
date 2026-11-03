import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/account/password/change.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'
import { makeBadResponse } from '~~/test/fixtures/allauth'

/**
 * POST /api/_allauth/app/v1/account/password/change. Django logs the
 * account out on a password change (ACCOUNT_LOGOUT_ON_PASSWORD_CHANGE),
 * so allauth answers it with the 401 of the signed-out visitor and never
 * a 200 (the document gives the operation no 2xx); a refused change
 * (wrong current password) is RETURNED with allauth's errors for the
 * form to show.
 */

const route = '/api/_allauth/app/v1/account/password/change'
const body = { current_password: 'old-secret', new_password: 'new-secret-123' }

const loggedOut = jsonResponse({
  status: 401,
  data: { flows: [{ id: 'login' }] },
  meta: { is_authenticated: false },
}, 401)

const change = (payload: Record<string, unknown> = body) =>
  callRoute(handler, { route, method: 'POST', body: payload })

describe('POST /api/_allauth/app/v1/account/password/change', () => {
  it('sends the change to allauth with the stored session and answers the 401 of the logged-out account', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1', accessToken: 'knox-1' } })
    backend.reply(loggedOut)

    const response = await change()

    expect(response.status).toBe(401)
    const sent = backend.lastRequest
    expect(sent.method).toBe('POST')
    expect(sent.path).toBe('http://backend.test/_allauth/app/v1/account/password/change')
    expect(sent.body).toEqual(body)
    expect(sent.headers.get('x-session-token')).toBe('sess-1')
    expect(sent.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('returns allauth\'s errors with the 400 for the form', async () => {
    const refused = makeBadResponse({ code: 'enter_current_password', param: 'current_password', message: 'Please type your current password.' })
    backend.reply(jsonResponse(refused, 400))

    const response = await change()

    expect(response.status).toBe(400)
    expect(response.error).toBeUndefined()
    expect(response.body).toEqual({ statusCode: 400, statusMessage: 'Bad Request', data: refused })
  })

  it('rejects a body without a new password before calling allauth', async () => {
    const response = await change({ current_password: 'old-secret' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
