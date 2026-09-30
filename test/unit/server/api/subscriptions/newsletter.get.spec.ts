import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/subscriptions/newsletter.get'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/subscriptions/newsletter'

describe('GET /api/subscriptions/newsletter', () => {
  it('reads availability from the store\'s backend', async () => {
    backend.reply({ available: true })

    const response = await callRoute(handler, { route, headers: { 'x-forwarded-host': 'evil.example' } })

    expect(response.body).toEqual({ available: true })
    expect(backend.lastRequest).toMatchObject({
      path: 'http://backend.test/api/v1/user/subscription/newsletter',
      method: 'GET',
    })
    // The answer is per tenant, so Django must see this store's host.
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('propagates the 404 Django answers while the newsletter is off', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(404)
  })
})
