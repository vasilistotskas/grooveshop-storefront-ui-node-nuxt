/**
 * An unpublished ContentPage is DATA, not a fault.
 *
 * Every tenant is seeded legal pages unpublished, and `useLegalPage`
 * probes for them on every render of /terms-of-use, /privacy-policy and
 * /cookies-policy so a merchant's own text can win when it exists. A
 * thrown 404 is never cached (a Django round-trip per SSR) and logs a
 * warning each time — for the normal case. So 404 comes back as an
 * absent page, and everything else still propagates so /info/[slug] can
 * tell a missing page apart from an outage.
 */
import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/content-pages/[slug].get'
import { zRetrieveContentPageResponse } from '~~/shared/openapi/zod.gen'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse, log } from '~~/test/helpers/nitro'

const route = '/api/content-pages/:slug'

const PAGE = zRetrieveContentPageResponse.parse({
  id: 2,
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  slug: 'terms',
  translations: { el: { title: 'Όροι Χρήσης', body: '<p>Κείμενο</p>' } },
  isPublished: true,
  publishedAt: '2026-09-01T10:00:00+03:00',
  createdAt: '2026-09-01T10:00:00+03:00',
  updatedAt: '2026-09-01T10:00:00+03:00',
})

describe('GET /api/content-pages/[slug]', () => {
  it('wraps a published page in the response envelope, fetched on the request\'s store', async () => {
    backend.reply(PAGE)

    const response = await callRoute(handler, {
      route,
      url: '/api/content-pages/terms',
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ page: PAGE })
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/content-page/terms')
    // ContentPage rows are per-tenant; the tenant is the Host, never X-Forwarded-Host.
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('returns an absent page for an upstream 404, quietly', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await callRoute(handler, { route, url: '/api/content-pages/terms' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ page: null })
    expect(log.warn).not.toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })

  it('still propagates a 5xx, so an outage is not served as a missing page', async () => {
    backend.reply(jsonResponse({ detail: 'boom' }, 503))

    const response = await callRoute(handler, { route, url: '/api/content-pages/terms' })

    expect(response.status).toBe(503)
  })

  it('propagates a network failure rather than masking it as absent', async () => {
    backend.reply(() => {
      throw new TypeError('fetch failed')
    })

    const response = await callRoute(handler, { route, url: '/api/content-pages/terms' })

    expect(response.status).toBe(500)
    expect(response.body).not.toHaveProperty('page')
  })

  it('propagates a schema mismatch instead of masking it as absent', async () => {
    backend.reply({ ...PAGE, slug: 42 })

    const response = await callRoute(handler, { route, url: '/api/content-pages/terms' })

    expect(response.status).toBe(422)
  })

  it('keys the cache by slug', async () => {
    const { getKey } = cacheOptionsOf(handler)
    const keyFor = (slug: string) => getKey!(createTestEvent({ context: { params: { slug } } }))

    expect(await keyFor('about-us')).not.toBe(await keyFor('faq'))
    expect((await keyFor('about-us')).startsWith('shop.test__el__content-page:about-us')).toBe(true)
  })
})
