import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/account/password/change.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/_allauth/app/v1/account/password/change. Django logs the
 * account out on a password change (ACCOUNT_LOGOUT_ON_PASSWORD_CHANGE),
 * revoking the Knox token, so the stored session must go with it; a
 * refused change (wrong current password) is RETURNED with allauth's
 * errors for the form to show.
 */

const route = '/api/_allauth/app/v1/account/password/change'
const body = { current_password: 'old-secret', new_password: 'new-secret-123' }

const sessionResponse = (meta: Record<string, unknown>) => ({
  status: 200,
  data: { user: { id: 5 }, methods: [{ method: 'password', at: 1_700_000_000 }] },
  meta,
})

const change = (payload: Record<string, unknown> = body) =>
  callRoute(handler, { route, method: 'POST', body: payload })

describe('POST /api/_allauth/app/v1/account/password/change', () => {
  it('sends the change to allauth with the stored session', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1', accessToken: 'knox-1' } })
    backend.reply(sessionResponse({ is_authenticated: false }))

    const response = await change()

    expect(response.status).toBe(200)
    const sent = backend.lastRequest
    expect(sent.method).toBe('POST')
    expect(sent.path).toBe('http://backend.test/_allauth/app/v1/account/password/change')
    expect(sent.body).toEqual(body)
    expect(sent.headers.get('x-session-token')).toBe('sess-1')
    expect(sent.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('clears the stored session once Django has logged the account out', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1', accessToken: 'knox-1' }, user: { id: 5 } })
    backend.reply(sessionResponse({ is_authenticated: false }))

    await change()

    expect(testSession.data).toEqual({})
  })

  it('keeps the session, with the rotated token, when the account stays signed in', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1', accessToken: 'knox-1' } })
    backend.reply(sessionResponse({ session_token: 'sess-2' }))

    await change()

    expect(testSession.data.secure).toEqual({ sessionToken: 'sess-2', accessToken: 'knox-1' })
  })

  it('returns allauth\'s errors with the 400 for the form', async () => {
    const refused = { status: 400, errors: [{ code: 'enter_current_password', param: 'current_password', message: 'Please type your current password.' }] }
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
