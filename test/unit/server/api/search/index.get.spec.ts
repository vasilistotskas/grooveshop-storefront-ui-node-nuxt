import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/search/index.get'
import { backend, callRoute } from '~~/test/helpers/nitro'
import {
  makeBlogPostSearchHit,
  makeBlogPostSearchResponse,
  makeProductSearchHit,
  makeProductSearchResponse,
} from '~~/test/fixtures/productFilters'

/**
 * GET /api/search: the search palette's products and guides, one request
 * for both. The guides come from the blog search, which a store without
 * the blog plan answers with 404 — and asking anyway failed the whole
 * palette, products included.
 */

const route = '/api/search'

const products = makeProductSearchResponse({ results: [makeProductSearchHit({ id: 7 })] })
const posts = makeBlogPostSearchResponse({ results: [makeBlogPostSearchHit({ id: 4 })] })

const search = (blogEnabled: boolean) =>
  callRoute(handler, {
    route,
    url: `${route}?query=power%20bank&languageCode=el`,
    context: { tenant: { blogEnabled } },
  })

describe('GET /api/search', () => {
  it('returns products and guides from the two searches when the store has a blog', async () => {
    backend.reply(request => request.path.endsWith('/search/blog/post') ? posts : products)

    const response = await search(true)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ products, blogPosts: posts })
    expect(backend.requests.map(request => request.path).sort()).toEqual([
      'http://backend.test/api/v1/search/blog/post',
      'http://backend.test/api/v1/search/product',
    ])
  })

  it('returns the products alone, without asking for guides, when the plan has no blog', async () => {
    backend.reply(products)

    const response = await search(false)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ products, blogPosts: null })
    expect(backend.requests.map(request => request.path)).toEqual([
      'http://backend.test/api/v1/search/product',
    ])
  })

  it('answers with nothing, without calling the backend, for an empty query', async () => {
    const response = await callRoute(handler, { route, url: `${route}?query=%20&languageCode=el` })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ products: null, blogPosts: null })
    expect(backend.requests).toEqual([])
  })
})
