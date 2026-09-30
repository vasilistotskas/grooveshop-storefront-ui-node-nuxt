import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/content-pages/index.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent } from '~~/test/helpers/nitro'

const route = '/api/content-pages'
const page = { count: 0, results: [] }

describe('GET /api/content-pages', () => {
  it('forwards the validated query to Django on the request\'s store', async () => {
    backend.reply(page)

    const response = await callRoute(handler, {
      route,
      url: '/api/content-pages?ordering=-slug&page=2',
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(page)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/content-page')
    expect(backend.lastRequest.query).toMatchObject({ ordering: '-slug', page: '2', languageCode: 'el' })
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('rejects an unknown ordering without calling the backend', async () => {
    const response = await callRoute(handler, { route, url: '/api/content-pages?ordering=body' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('keys the cache by every listing parameter, defaulting the omitted ones', async () => {
    const { getKey } = cacheOptionsOf(handler)
    const keyFor = (search: string) => getKey!(createTestEvent({ url: `/api/content-pages${search}` }))

    const defaults = await keyFor('')

    expect(await keyFor('?ordering=slug')).not.toBe(await keyFor('?ordering=-slug'))
    expect(await keyFor('?page=2')).not.toBe(defaults)
    // The key spells out the defaults, so omitting them shares the entry.
    expect(await keyFor('?pageSize=10&page=1&ordering=-publishedAt&languageCode=el')).toBe(defaults)
  })
})
