import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/products/search.get'
import forwardedProto from '~~/server/plugins/forwarded-proto'
import { zProductMeiliSearchResponse } from '~~/shared/openapi/zod.gen'
import {
  backend,
  cacheOptionsOf,
  callRoute,
  createTestEvent,
  jsonResponse,
  log,
  runNitroPlugin,
} from '~~/test/helpers/nitro'

/**
 * GET /api/products/search: the Meilisearch product search proxy. The
 * route renames the storefront's camelCase filters to the snake_case
 * Django reads, and keys its short cache on every filter it forwards.
 */

const route = '/api/products/search'

const emptyPage = {
  queryId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  relaxedQuery: null,
  limit: 20,
  offset: 0,
  estimatedTotalHits: 0,
  results: [],
}

const search = (query = '', init: { headers?: Record<string, string>, context?: Record<string, unknown> } = {}) =>
  callRoute(handler, { route, url: `${route}${query ? `?${query}` : ''}`, ...init })

describe('GET /api/products/search', () => {
  it('uses a response fixture the generated schema accepts', () => {
    expect(zProductMeiliSearchResponse.safeParse(emptyPage).success).toBe(true)
  })

  it.each([
    ['a non-numeric priceMin', 'priceMin=cheap'],
    ['a non-integer limit', 'limit=ten'],
    ['a non-integer viewsMin', 'viewsMin=1.5'],
    ['an inStock that is not a flag', 'inStock=ture'],
    ['an onOffer that is not a flag', 'onOffer=maybe'],
  ])('answers 400 for %s without calling the backend', async (_label, query) => {
    const response = await search(query)

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })

  it('GETs the product search with the default paging and facets', async () => {
    backend.reply(emptyPage)

    const response = await search('languageCode=el')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(emptyPage)
    const sent = backend.lastRequest
    expect(sent.method).toBe('GET')
    expect(sent.path).toBe('http://backend.test/api/v1/search/product')
    expect(sent.query).toEqual({
      query: '',
      language_code: 'el',
      limit: '20',
      offset: '0',
      facets: 'category,final_price,likes_count,view_count,attribute_values',
    })
  })

  it('forwards each filter under the name Django reads, attribute values as camelCase', async () => {
    backend.reply(emptyPage)

    await search('query=laptop&priceMin=500&priceMax=1500&likesMin=3&viewsMin=10&categories=1,2&sort=price:asc&attributeValues=10,20&facets=category&limit=5&offset=10')

    expect(backend.lastRequest.query).toEqual({
      query: 'laptop',
      limit: '5',
      offset: '10',
      facets: 'category',
      price_min: '500',
      price_max: '1500',
      likes_min: '3',
      views_min: '10',
      categories: '1,2',
      sort: 'price:asc',
      // Pinned: Django's search view reads this one in camelCase.
      attributeValues: '10,20',
    })
  })

  it('forwards the brands, and the in-stock and on-offer flags as snake_case', async () => {
    backend.reply(emptyPage)

    await search('brands=3,7&inStock=true&onOffer=1')

    expect(backend.lastRequest.query).toMatchObject({ brands: '3,7', in_stock: 'true', on_offer: '1' })
  })

  it('sends none of them when the shopper set none', async () => {
    backend.reply(emptyPage)

    await search('query=laptop')

    const sent = backend.lastRequest.query
    expect(sent).not.toHaveProperty('brands')
    expect(sent).not.toHaveProperty('in_stock')
    expect(sent).not.toHaveProperty('on_offer')
  })

  it('keeps a zero price floor and drops empty categories and sort', async () => {
    backend.reply(emptyPage)

    await search('priceMin=0&categories=&sort=')

    const sent = backend.lastRequest.query
    expect(sent.price_min).toBe('0')
    expect(sent).not.toHaveProperty('categories')
    expect(sent).not.toHaveProperty('sort')
  })

  it('answers 422 and logs a response contract failure when Django\'s payload drifts', async () => {
    backend.reply({ ...emptyPage, results: 'not-a-list' })

    const response = await search('query=laptop')

    expect(response.status).toBe(422)
    expect(log.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'validation:response' }))
  })

  it('records the query and the number of hits on the wide event', async () => {
    backend.reply(emptyPage)

    const response = await search('query=laptop')

    expect(response.logger.fields).toMatchObject({ search: { query: 'laptop', resultCount: 0 } })
  })

  it('passes an upstream 5xx through without its body', async () => {
    backend.reply(jsonResponse({ detail: 'meilisearch: connection refused at 10.0.0.5' }, 503))

    const response = await search('query=laptop')

    expect(response.status).toBe(503)
    expect(JSON.stringify(response.body)).not.toContain('meilisearch')
  })

  it('reaches Django as the caller\'s store once the forwarded-headers plugin is active', async () => {
    // The route sends no tenant headers itself: its raw `$fetch` relies on
    // the `forwarded-proto` plugin's global patch for them.
    await runNitroPlugin(forwardedProto)
    backend.reply(emptyPage)

    await search('query=laptop', { headers: { 'x-forwarded-host': 'evil.example' }, context: { locale: 'en' } })

    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
    expect(backend.lastRequest.headers.get('x-language')).toBe('en')
  })

  describe('cache', () => {
    const { getKey } = cacheOptionsOf(handler)
    const keyFor = (query: string, locale?: string) =>
      getKey!(createTestEvent({ url: `${route}?${query}`, context: locale ? { locale } : {} }))

    it('never serves a stale result and keeps entries for a minute', () => {
      // A deliberate decision (see the route): sort/filter results must
      // not survive a backend change through stale-while-revalidate.
      expect(cacheOptionsOf(handler)).toMatchObject({ swr: false, maxAge: 60 })
    })

    it('prefixes the key with the store and the page locale', async () => {
      expect(await keyFor('query=laptop', 'en')).toMatch(/^shop\.test__en__search:products:/)
    })

    it.each([
      'attributeValues=10',
      'brands=3',
      'categories=1',
      'facets=category',
      'inStock=true',
      'languageCode=en',
      'likesMin=3',
      'limit=5',
      'offset=40',
      'onOffer=true',
      'priceMax=100',
      'priceMin=10',
      'query=phone',
      'sort=price:asc',
      'viewsMin=7',
    ])('gives a search differing only in %s its own entry', async (filter) => {
      expect(await keyFor(filter)).not.toBe(await keyFor(''))
    })

    it('treats omitted paging as the default page', async () => {
      expect(await keyFor('query=laptop')).toBe(await keyFor('query=laptop&limit=20&offset=0'))
    })
  })
})
