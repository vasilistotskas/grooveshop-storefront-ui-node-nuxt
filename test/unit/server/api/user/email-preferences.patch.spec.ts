import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/user/email-preferences.patch'
import { makeEmailPreferences } from '~~/test/fixtures/subscription'
import { backend, callRoute, jsonResponse, testSession } from '~~/test/helpers/nitro'

/**
 * PATCH /api/user/email-preferences: turn store marketing emails on or off
 * for the signed-in customer's own address.
 */
const route = '/api/user/email-preferences'
const signIn = () => testSession.set({ user: { id: 1 }, secure: { accessToken: 'knox-1' } })
const change = (body: unknown) => callRoute(handler, { route, url: route, method: 'PATCH', body })

describe('PATCH /api/user/email-preferences', () => {
  it('sends the choice to Django as the signed-in customer and answers its whole list', async () => {
    signIn()
    const after = makeEmailPreferences([
      { key: 'user.reengagement', title: 'Μας λείπετε', enabled: true },
    ])
    backend.reply(after)

    const response = await change({ types: [{ key: 'user.reengagement', enabled: true }] })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(after)
    expect(backend.lastRequest).toMatchObject({
      method: 'PATCH',
      path: 'http://backend.test/api/v1/user/email-preferences',
      body: { types: [{ key: 'user.reengagement', enabled: true }] },
    })
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
  })

  it('refuses a choice without a key, without calling Django', async () => {
    signIn()

    expect((await change({ types: [{ enabled: true }] })).status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('passes Django\'s refusal of a type it does not offer on with its body', async () => {
    signIn()
    const refusal = { detail: 'Not an email type you can choose: x.', code: 'unknown_email_type' }
    backend.reply(jsonResponse(refusal, 400))

    const response = await change({ types: [{ key: 'x', enabled: true }] })

    expect(response.status).toBe(400)
    expect(response.body).toEqual(refusal)
  })

  it('refuses a visitor who is not signed in, without calling Django', async () => {
    expect((await change({ types: [{ key: 'user.reengagement', enabled: true }] })).status).toBe(401)
    expect(backend.requests).toEqual([])
  })
})
