import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/products/[id]/variants.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

const route = '/api/products/:id/variants'
const variants = { axes: [], variants: [] }

describe('GET /api/products/[id]/variants', () => {
  it('fetches the product\'s variants for the store the request is on', async () => {
    backend.reply(variants)

    const response = await callRoute(handler, {
      route,
      url: '/api/products/42/variants',
      headers: { 'x-forwarded-host': 'evil.example' },
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(variants)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/product/42/variants')
    // The tenant comes from Host, never from a caller-supplied X-Forwarded-Host.
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('rejects a non-numeric product id without calling the backend', async () => {
    const response = await callRoute(handler, { route, url: '/api/products/abc/variants' })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('answers 422 when the backend payload drifts from the contract', async () => {
    backend.reply({ axes: [] })

    const response = await callRoute(handler, { route, url: '/api/products/42/variants' })

    expect(response.status).toBe(422)
  })

  it('passes an upstream 404 through', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const response = await callRoute(handler, { route, url: '/api/products/42/variants' })

    expect(response.status).toBe(404)
  })

  it('keys the cache by product id', async () => {
    const { getKey } = cacheOptionsOf(handler)
    const keyFor = (id: string) => getKey!(createTestEvent({ context: { params: { id } } }))

    expect(await keyFor('42')).not.toBe(await keyFor('43'))
    expect((await keyFor('42')).startsWith('shop.test__el__product-variants:42')).toBe(true)
  })
})
