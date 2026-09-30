import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/page-config/[pageType].get'
import { zPageLayout } from '~~/shared/openapi/zod.gen'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse, log } from '~~/test/helpers/nitro'

const route = '/api/page-config/:pageType'

function layoutWith(props: Record<string, unknown>) {
  return zPageLayout.parse({
    id: 7,
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    pageType: 'products',
    title: 'Products band',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    isPublished: true,
    metadata: {},
    sections: [
      {
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        componentType: 'hero_banner',
        title: '',
        isVisible: true,
        props,
        sortOrder: 0,
      },
    ],
  })
}

const get = (url = '/api/page-config/products', locale = 'el') =>
  callRoute(handler, { route, url, context: { locale }, headers: { 'x-forwarded-host': 'evil.example' } })

describe('GET /api/page-config/[pageType]', () => {
  it('asks the store\'s backend for the layout in the page locale and returns sanitised props', async () => {
    backend.reply(layoutWith({ heading: 'Summer', notAProp: 'x' }))

    const response = await get('/api/page-config/products', 'en')

    expect(response.status).toBe(200)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/page-config/products')
    expect(backend.lastRequest.query).toEqual({ locale: 'en' })
    // page_config rows are per-tenant tables.
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
    expect(response.body.layout.pageType).toBe('products')
    // Unknown keys are stripped, so the Renderer can v-bind props as-is.
    expect(response.body.layout.sections[0].props).toEqual({ heading: 'Summer' })
  })

  it('keeps a section with invalid props, on component defaults, and warns', async () => {
    backend.reply(layoutWith({ heading: 'Summer', overlayOpacity: 5 }))

    const response = await get()

    expect(response.status).toBe(200)
    expect(response.body.layout.sections).toHaveLength(1)
    expect(response.body.layout.sections[0].props).toEqual({})
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({
      tag: 'page-config',
      componentType: 'hero_banner',
      error: expect.stringContaining('overlayOpacity'),
    }))
  })

  it('returns { layout: null } for an upstream 404 without logging', async () => {
    // "No PUBLISHED layout for this page type" is the documented state
    // for every page type defaults.py does not seed. As data it is
    // cached; a thrown error is not, and costs a round-trip per SSR.
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await get()

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ layout: null })
    expect(log.warn).not.toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })

  it('still propagates an upstream 5xx so callers can tell an outage from an absent layout', async () => {
    backend.reply(jsonResponse({ detail: 'down' }, 503))

    const response = await get()

    expect(response.status).toBe(503)
  })

  it('propagates a schema mismatch instead of masking it as an absent layout', async () => {
    backend.reply({ ...layoutWith({}), sections: 'not-a-list' })

    const response = await get()

    expect(response.status).toBe(422)
  })

  it('propagates a network failure instead of masking it as an absent layout', async () => {
    backend.reply(() => {
      throw new TypeError('fetch failed')
    })

    const response = await get()

    expect(response.status).toBe(500)
  })

  it('keys the cache by page type and locale', async () => {
    const { getKey } = cacheOptionsOf(handler)
    const keyFor = (pageType: string, locale = 'el') =>
      getKey!(createTestEvent({ context: { params: { pageType }, locale } }))

    expect(await keyFor('products')).not.toBe(await keyFor('blog'))
    expect((await keyFor('home', 'en')).startsWith('shop.test__en__page-config:home:en')).toBe(true)
  })
})
