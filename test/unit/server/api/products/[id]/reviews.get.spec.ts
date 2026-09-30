import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/products/[id]/reviews.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/products/:id/reviews'
const page = { count: 0, results: [] }

describe('GET /api/products/[id]/reviews', () => {
  it('forwards the page and ordering the product page asked for', async () => {
    backend.reply(page)

    const response = await callRoute(handler, { route, url: '/api/products/42/reviews?ordering=-rate&page=2&pageSize=6' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(page)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/product/42/reviews')
    expect(backend.lastRequest.query).toMatchObject({ ordering: '-rate', page: '2', pageSize: '6' })
  })

  it('rejects an ordering the API does not advertise without calling the backend', async () => {
    const response = await callRoute(handler, { route, url: '/api/products/42/reviews?ordering=password' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('answers 422 when the backend payload drifts from the contract', async () => {
    backend.reply({ results: 'not-a-list' })

    const response = await callRoute(handler, { route, url: '/api/products/42/reviews' })

    expect(response.status).toBe(422)
  })

  it('passes an upstream 404 through with its status', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await callRoute(handler, { route, url: '/api/products/42/reviews' })

    expect(response.status).toBe(404)
  })

  it('keys the cache by the query, so two sorts never share an entry', async () => {
    const { getKey } = cacheOptionsOf(handler)
    const keyFor = (url: string) => getKey!(createTestEvent({ url, context: { params: { id: '42' } } }))

    const ascending = await keyFor('/api/products/42/reviews?ordering=createdAt')
    const descending = await keyFor('/api/products/42/reviews?ordering=-createdAt')

    expect(ascending).not.toBe(descending)
    expect(ascending.startsWith('shop.test__el__product-reviews:42:')).toBe(true)
  })
})
