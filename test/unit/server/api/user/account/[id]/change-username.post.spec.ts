import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/user/account/[id]/change-username.post'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * POST /api/user/account/[id]/change-username. The session's user is
 * updated with the new name only once Django accepted it; a refusal
 * (409 "taken") is RETURNED for the form to show.
 */

const route = '/api/user/account/:id/change-username'
const url = '/api/user/account/5/change-username'
const signedIn = { user: { id: 5, username: 'maria', email: 'maria@example.com' }, secure: { accessToken: 'knox-1' } }

const request = (body: unknown = { username: 'maria.p' }) => callRoute(handler, { route, url, method: 'POST', body })

describe('POST /api/user/account/[id]/change-username', () => {
  it('changes the name at Django and in the session\'s user', async () => {
    testSession.set(signedIn)
    backend.reply({ detail: 'Username updated.' })

    const response = await request()

    expect(response.status).toBe(200)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/user/account/5/change_username')
    expect(backend.lastRequest.body).toEqual({ username: 'maria.p' })
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
    expect(testSession.data.user).toEqual({ id: 5, username: 'maria.p', email: 'maria@example.com' })
    expect(testSession.data.secure).toEqual({ accessToken: 'knox-1' })
  })

  it('returns Django\'s refusal and keeps the old name', async () => {
    testSession.set(signedIn)
    backend.reply(jsonResponse({ detail: 'Username already taken.' }, 409))

    const response = await request()

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ detail: 'Username already taken.' })
    expect(testSession.data.user.username).toBe('maria')
  })

  it('rejects a name with characters Django refuses', async () => {
    testSession.set(signedIn)

    const response = await request({ username: 'maria p!' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('answers 401 to a visitor who is not signed in', async () => {
    const response = await request()

    expect(response.status).toBe(401)
    expect(backend.requests).toEqual([])
  })
})
