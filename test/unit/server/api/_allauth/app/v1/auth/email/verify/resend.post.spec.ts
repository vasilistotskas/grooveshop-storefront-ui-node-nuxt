import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/_allauth/app/v1/auth/email/verify/resend.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/_allauth/app/v1/auth/email/verify/resend: sends the emailed code again for
 * the flow the stored session is pending on. A 409 (nothing pending, or the
 * resend quota spent) is RETURNED with its status so the page can send the
 * shopper back to the request step; a 429 cooldown or rate limit is thrown
 * with its status for the "wait" toast.
 */

const route = '/api/_allauth/app/v1/auth/email/verify/resend'

const resend = () => callRoute(handler, { route, method: 'POST' })

describe('POST /api/_allauth/app/v1/auth/email/verify/resend', () => {
  it('asks allauth to resend with the session token of the pending flow', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1' } })
    backend.reply({ status: 200 })

    const response = await resend()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 200 })
    const sent = backend.lastRequest
    expect(sent.method).toBe('POST')
    expect(sent.path).toBe('http://backend.test/_allauth/app/v1/auth/email/verify/resend')
    expect(sent.headers.get('x-session-token')).toBe('sess-1')
  })

  it('stores a rotated session token', async () => {
    testSession.set({ secure: { sessionToken: 'sess-1' } })
    backend.reply({ status: 200, meta: { is_authenticated: false, session_token: 'sess-2' } })

    await resend()

    expect(testSession.data.secure).toEqual(expect.objectContaining({ sessionToken: 'sess-2' }))
  })

  it('returns a 409 with its status when there is nothing left to resend', async () => {
    backend.reply(jsonResponse({ status: 409 }, 409))

    const response = await resend()

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ statusCode: 409, statusMessage: 'Conflict', data: { status: 409 } })
  })

  it('answers a cooldown with a 429', async () => {
    backend.reply(jsonResponse({ status: 429 }, 429))

    const response = await resend()

    expect(response.status).toBe(429)
  })
})
