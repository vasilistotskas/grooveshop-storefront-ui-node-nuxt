import { describe, expect, it } from 'vitest'
import { cacheKeyBelongsToHost } from '~~/server/utils/cacheKey'
import { cachedRead } from '~~/server/utils/builderData/loaders'
import { readData, resolveBuilderData } from '~~/server/utils/builderData/resolve'
import { backend, cacheOptionsOf, createRequestEvent, jsonResponse } from '~~/test/helpers/nitro'
import { makeBlogPost } from '~~/test/fixtures/blog'
import { makeProductCard } from '~~/test/fixtures/product'
import { makePromotion } from '~~/test/fixtures/promotion'
import { zListProductResponse } from '~~/shared/openapi/zod.gen'
import type { DataPlan } from '~~/shared/types/builderData'

const page = (results: unknown[]) => ({ count: results.length, results })
const context = { tenantHost: 'shop-a.test', locale: 'en' }
const emptyIds = { product: [], blogPost: [], category: [], blogCategory: [] }
const newest = { mode: 'filter', ordering: 'newest', limit: 4 }

const planOf = (overrides: Partial<DataPlan> = {}): DataPlan => ({ ids: emptyIds, queries: new Map(), ...overrides })

describe('readData', () => {
  it('reads every product id of the page in ONE request, as the store, in the page\'s language', async () => {
    backend.reply(() => page([makeProductCard({ id: 2 }), makeProductCard({ id: 7 })]))

    const resolution = await readData(context, planOf({ ids: { ...emptyIds, product: [2, 7, 9] } }))

    expect(backend.requests).toHaveLength(1)
    expect(backend.lastRequest.url.pathname).toBe('/api/v1/product')
    expect(backend.lastRequest.url.searchParams.get('id_In')).toBe('2,7,9')
    expect(backend.lastRequest.url.searchParams.get('pageSize')).toBe('3')
    expect(backend.lastRequest.url.searchParams.get('languageCode')).toBe('en')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop-a.test')
    expect(backend.lastRequest.headers.get('x-language')).toBe('en')
    const products = resolution.records.product
    expect(products).not.toBe('failed')
    expect([...(products as ReadonlyMap<number, unknown>).keys()]).toEqual([2, 7])
  })

  it('makes no request for a kind the page does not read', async () => {
    const resolution = await readData(context, planOf())

    expect(backend.requests).toEqual([])
    expect(resolution.records.product).toEqual(new Map())
  })

  it('reads each distinct list once, with the question its descriptor comes to', async () => {
    backend.reply(request => request.url.pathname.endsWith('/blog/post') ? page([makeBlogPost({ id: 3 })]) : page([makeProductCard({ id: 1 })]))
    const queries = new Map([
      ['p', { source: 'product' as const, descriptor: { ...newest, categories: [4, 2] }, key: 'p' }],
      ['b', { source: 'blogPost' as const, descriptor: { mode: 'filter', ordering: 'mostViewed', limit: 2 }, key: 'b' }],
    ])

    const resolution = await readData(context, planOf({ queries }))

    const asked = backend.requests.map(request => [request.url.pathname, request.url.searchParams.get('ordering'), request.url.searchParams.get('category')])
    expect(asked).toEqual(expect.arrayContaining([
      ['/api/v1/product', '-createdAt', '2_4'],
      ['/api/v1/blog/post', '-viewCount', null],
    ]))
    expect(backend.requests).toHaveLength(2)
    expect((resolution.queries.get('p') as unknown[]).length).toBe(1)
    expect((resolution.queries.get('b') as unknown[]).length).toBe(1)
  })

  it('keeps the first `limit` offers: the endpoint has no page size', async () => {
    backend.reply(() => [makePromotion({ id: 1 }), makePromotion({ id: 2 }), makePromotion({ id: 3 })])

    const resolution = await readData(context, planOf({ queries: new Map([['o', { source: 'promotion' as const, descriptor: { limit: 2 }, key: 'o' }]]) }))

    expect((resolution.queries.get('o') as Array<{ id: number }>).map(({ id }) => id)).toEqual([1, 2])
    expect(backend.lastRequest.url.pathname).toBe('/api/v1/promotion')
  })

  it('asks a category list for its roots, and a blog category list for its page', async () => {
    backend.reply(() => page([]))
    const queries = new Map([
      ['c', { source: 'category' as const, descriptor: { mode: 'roots', limit: 8 }, key: 'c' }],
      ['bc', { source: 'blogCategory' as const, descriptor: { limit: 10 }, key: 'bc' }],
    ])

    await readData(context, planOf({ queries }))

    const asked = backend.requests.map(request => [request.url.pathname, request.url.searchParams.get('isRoot'), request.url.searchParams.get('pageSize')])
    expect(asked).toEqual(expect.arrayContaining([
      ['/api/v1/product/category', 'true', '8'],
      ['/api/v1/blog/category', null, '10'],
    ]))
  })

  it('answers `failed` for the read that failed and still answers the others', async () => {
    backend.reply(request => request.url.pathname.endsWith('/blog/post') ? jsonResponse({ detail: 'down' }, 503) : page([makeProductCard({ id: 1 })]))
    const queries = new Map([
      ['p', { source: 'product' as const, descriptor: newest, key: 'p' }],
      ['b', { source: 'blogPost' as const, descriptor: { mode: 'filter', ordering: 'newest', limit: 2 }, key: 'b' }],
    ])

    const resolution = await readData(context, planOf({ queries, ids: { ...emptyIds, blogCategory: [1] } }))

    expect(resolution.queries.get('b')).toBe('failed')
    expect(resolution.queries.get('p')).toHaveLength(1)
    expect(resolution.records.blogCategory).toBe('failed')
  })

  it('answers `failed` for a descriptor its source does not know, instead of reading something else', async () => {
    backend.reply(() => page([]))

    const resolution = await readData(context, planOf({ queries: new Map([['p', { source: 'product' as const, descriptor: { mode: 'filter', ordering: 'featured', limit: 4 }, key: 'p' }]]) }))

    expect(resolution.queries.get('p')).toBe('failed')
    expect(backend.requests).toEqual([])
  })

  it('splits more ids than a page holds into several reads', async () => {
    backend.reply(() => page([]))

    await readData(context, planOf({ ids: { ...emptyIds, product: Array.from({ length: 150 }, (_, index) => index + 1) } }))

    expect(backend.requests.map(request => request.url.searchParams.get('pageSize'))).toEqual(['100', '50'])
  })
})

describe('the cache of a read', () => {
  const read = cachedRead('builderDataTest', '/product', zListProductResponse)
  const keyOf = (host: string, locale: string, query: Record<string, string | number>) => {
    const { getKey } = cacheOptionsOf(read)
    if (!getKey) throw new Error('A read must state its key')
    return getKey(host, locale, query) as string
  }

  it('lives briefly and expires from storage: no stale-while-revalidate, which keeps an entry for ever', () => {
    expect(cacheOptionsOf(read)).toMatchObject({ name: 'builderDataTest', maxAge: 60, swr: false })
  })

  it('keys on the store, the language and the question, so none can serve another', () => {
    const base = keyOf('shop-a.test', 'en', { pageSize: 4 })

    expect(keyOf('shop-b.test', 'en', { pageSize: 4 })).not.toBe(base)
    expect(keyOf('shop-a.test', 'el', { pageSize: 4 })).not.toBe(base)
    expect(keyOf('shop-a.test', 'en', { pageSize: 5 })).not.toBe(base)
    // Two questions that differ only in the order they were written are one entry.
    expect(keyOf('shop-a.test', 'en', { a: 1, b: 2 })).toBe(keyOf('shop-a.test', 'en', { b: 2, a: 1 }))
  })

  it('names the store as its own segment, so a purge scoped to a store finds it and no other', () => {
    const key = `nitro:functions:builderDataTest:${keyOf('shop-a.test', 'en', { pageSize: 4 })}.json`

    expect(cacheKeyBelongsToHost(key, 'shop-a.test')).toBe(true)
    expect(cacheKeyBelongsToHost(key, 'shop-b.test')).toBe(false)
    expect(cacheKeyBelongsToHost(key, 'a.test')).toBe(false)
  })
})

describe('resolveBuilderData', () => {
  it('reads nothing for a page without data settings', async () => {
    const document = { sections: {}, order: [] }

    const resolved = await resolveBuilderData(createRequestEvent({ url: '/' }), document)

    expect(resolved).toEqual({ document, issues: [] })
    expect(backend.requests).toEqual([])
  })
})
