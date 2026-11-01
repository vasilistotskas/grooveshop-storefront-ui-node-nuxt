import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/user/email-preferences.get'
import { makeEmailPreferences } from '~~/test/fixtures/subscription'
import { backend, callRoute, testSession } from '~~/test/helpers/nitro'

/**
 * GET /api/user/email-preferences: the signed-in customer's "Store emails",
 * read from Django as that customer.
 */
const route = '/api/user/email-preferences'
const signIn = () => testSession.set({ user: { id: 1 }, secure: { accessToken: 'knox-1' } })
const read = () => callRoute(handler, { route, url: route, method: 'GET' })

describe('GET /api/user/email-preferences', () => {
  it('reads the list from Django as the signed-in customer', async () => {
    signIn()
    const preferences = makeEmailPreferences()
    backend.reply(preferences)

    const response = await read()

    expect(response.status).toBe(200)
    expect(response.body).toEqual(preferences)
    expect(backend.lastRequest).toMatchObject({
      method: 'GET',
      path: 'http://backend.test/api/v1/user/email-preferences',
    })
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('refuses a visitor who is not signed in, without calling Django', async () => {
    expect((await read()).status).toBe(401)
    expect(backend.requests).toEqual([])
  })
})
