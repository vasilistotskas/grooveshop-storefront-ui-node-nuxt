import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/user/account/[id]/delete-account.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/user/account/[id]/delete-account: the GDPR deletion request.
 * Once Django has queued the deletion the session is cleared in the same
 * response, so the redirect home is already signed out.
 */

const route = '/api/user/account/:id/delete-account'
const url = '/api/user/account/5/delete-account'
const signedIn = { user: { id: 5 }, secure: { accessToken: 'knox-1', sessionToken: 'sess-1' } }

const request = (body: unknown = { confirmation: 'DELETE' }) => callRoute(handler, { route, url, method: 'POST', body })

describe('POST /api/user/account/[id]/delete-account', () => {
  it('queues the deletion with the shopper\'s token and signs them out', async () => {
    testSession.set(signedIn)
    backend.reply({ detail: 'Deletion scheduled.' })

    const response = await request()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ detail: 'Deletion scheduled.' })
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/user/account/5/delete_account')
    expect(backend.lastRequest.body).toEqual({ confirmation: 'DELETE' })
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
    expect(testSession.data).toEqual({})
  })

  it('keeps the session when Django refuses', async () => {
    testSession.set(signedIn)
    backend.reply(jsonResponse({ detail: 'Wrong confirmation.' }, 400))

    const response = await request()

    expect(response.status).toBe(400)
    expect(testSession.data).toEqual(signedIn)
  })

  it.each([
    ['a visitor who is not signed in', {}],
    ['a session without an access token', { user: { id: 5 } }],
  ])('answers 401 for %s without calling Django', async (_label, session) => {
    testSession.set(session)

    const response = await request()

    expect(response.status).toBe(401)
    expect(backend.requests).toEqual([])
  })

  it('rejects an empty confirmation', async () => {
    testSession.set(signedIn)

    const response = await request({ confirmation: '' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
