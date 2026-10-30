import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/products/[id]/index.get'
import { makeProduct } from '~~/test/fixtures/product'
import { backend, callRoute } from '~~/test/helpers/nitro'

/**
 * GET /api/products/[id]: the product page's product. `Product.category`
 * is SET_NULL and optional in Django's admin, so a product whose category
 * was deleted, or that never had one, is served with `category: null`.
 * The page must render it, not answer 422.
 */

const route = '/api/products/:id'

const retrieved = (category: number | null) => ({
  ...makeProduct({ id: 42, category }),
  priceDropAlertsEnabled: false,
  ratingDistribution: [],
})

describe('GET /api/products/[id]', () => {
  it('serves a product with a category', async () => {
    backend.reply(retrieved(3))

    const response = await callRoute(handler, { route, url: '/api/products/42' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: 42, category: 3 })
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/product/42')
  })

  it('serves a product without a category', async () => {
    backend.reply(retrieved(null))

    const response = await callRoute(handler, { route, url: '/api/products/42' })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: 42, category: null })
  })
})
