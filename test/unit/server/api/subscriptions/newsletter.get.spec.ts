import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/subscriptions/newsletter.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

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

  it('asks about the newsletter a form names', async () => {
    backend.reply({ available: false })
    const named = await callRoute(handler, { route, url: `${route}?topic=7` })

    expect(named.body).toEqual({ available: false })
    expect(backend.lastRequest.url.searchParams.get('topic')).toBe('7')

    backend.reply({ available: true })
    const byDefault = await callRoute(handler, { route })

    expect(byDefault.body).toEqual({ available: true })
    expect(backend.lastRequest.url.searchParams.has('topic')).toBe(false)
  })

  it('keeps each newsletter\'s answer apart in the cache, and lets no caller grow the key', () => {
    const keyFor = (url: string) => cacheOptionsOf(handler).getKey!(createTestEvent({ host: 'shop.test', url, context: { locale: 'el' } }))

    expect(keyFor(`${route}?topic=7`)).not.toBe(keyFor(route))
    expect(keyFor(`${route}?topic=7`)).not.toBe(keyFor(`${route}?topic=8`))
    expect(keyFor(`${route}?topic=weekly`)).toBe(keyFor(route))
  })

  it('refuses a topic that is no number, without asking Django', async () => {
    const response = await callRoute(handler, { route, url: `${route}?topic=weekly` })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('propagates the 404 Django answers while the newsletter is off', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await callRoute(handler, { route })

    expect(response.status).toBe(404)
  })
})
