import { describe, expect, it, vi } from 'vitest'
import { cacheKeyBelongsToHost } from '~~/server/utils/cacheKey'
import { cachedRead, readMedia } from '~~/server/utils/builderData/loaders'
import { readData, resolveBuilderData } from '~~/server/utils/builderData/resolve'
import { backend, cacheOptionsOf, createRequestEvent, jsonResponse, log } from '~~/test/helpers/nitro'
import { makeBlogPost } from '~~/test/fixtures/blog'
import { makeResolvedAsset } from '~~/test/fixtures/media'
import { makeProductCard, makeProductCategory } from '~~/test/fixtures/product'
import { DATA_LIMITS, DATA_MEDIA_MAX_IDS } from '~~/shared/constants/builder'
import { makePromotion } from '~~/test/fixtures/promotion'
import { zListProductResponse } from '~~/shared/openapi/zod.gen'
import type { DataPlan, DataResolution, QueryAnswer } from '~~/shared/types/builderData'

const page = (results: unknown[]) => ({ count: results.length, results })
const context = { tenantHost: 'shop-a.test', locale: 'en' }
const emptyIds = { product: [], blogPost: [], category: [], blogCategory: [], media: [] }
const newest = { mode: 'filter', ordering: 'newest', limit: 4 }

/** A list the reads answered, which is not a failed one. */
const answerOf = (resolution: DataResolution, key: string): QueryAnswer<unknown> => {
  const answer = resolution.queries.get(key)
  if (answer === undefined || answer === 'failed') throw new Error(`${key} did not answer`)
  return answer
}

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
    expect(answerOf(resolution, 'p')).toEqual({ items: [expect.objectContaining({ id: 1 })], total: 1 })
    expect(answerOf(resolution, 'b')).toEqual({ items: [expect.objectContaining({ id: 3 })], total: 1 })
  })

  it('keeps the first `limit` offers: the endpoint has no page size', async () => {
    backend.reply(() => [makePromotion({ id: 1 }), makePromotion({ id: 2 }), makePromotion({ id: 3 })])

    const resolution = await readData(context, planOf({ queries: new Map([['o', { source: 'promotion' as const, descriptor: { limit: 2 }, key: 'o' }]]) }))

    expect((answerOf(resolution, 'o').items as Array<{ id: number }>).map(({ id }) => id)).toEqual([1, 2])
    // The count is of every live offer, not of the two kept.
    expect(answerOf(resolution, 'o').total).toBe(3)
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

  it('starts every read at once: the lists do not wait on the records, nor the records on the lists', async () => {
    const answers: Array<() => void> = []
    backend.reply(request => new Promise((resolve) => {
      answers.push(() => resolve(request.url.pathname.endsWith('/blog/post') ? page([makeBlogPost({ id: 3 })]) : page([makeProductCard({ id: 1 })])))
    }) as never)
    const queries = new Map([['b', { source: 'blogPost' as const, descriptor: { mode: 'filter', ordering: 'newest', limit: 2 }, key: 'b' }]])

    const reading = readData(context, planOf({ ids: { ...emptyIds, product: [1] }, queries }))
    await vi.waitFor(() => expect(backend.requests).toHaveLength(2))
    answers.forEach(answer => answer())
    await reading
  })

  it('reads no more lists than a document may, and says so, the rest being `failed`', async () => {
    backend.reply(() => page([]))
    const lists = Array.from({ length: DATA_LIMITS.maxQueriesPerDocument + 2 }, (_, index) => [`q${index}`, { source: 'product' as const, descriptor: { ...newest, limit: index + 1 }, key: `q${index}` }] as const)

    const resolution = await readData(context, planOf({ queries: new Map(lists) }))

    expect(backend.requests).toHaveLength(DATA_LIMITS.maxQueriesPerDocument)
    expect([...resolution.queries.values()].filter(answer => answer === 'failed')).toHaveLength(2)
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ tag: 'builder-data', max: DATA_LIMITS.maxQueriesPerDocument }))
  })

  it('counts what matches in all, not only the page it keeps', async () => {
    backend.reply(() => ({ count: 40, results: [makeProductCard({ id: 1 })] }))

    const resolution = await readData(context, planOf({ queries: new Map([['p', { source: 'product' as const, descriptor: newest, key: 'p' }]]) }))

    expect(answerOf(resolution, 'p').total).toBe(40)
  })

  describe('the main categories', () => {
    const roots = new Map([['c', { source: 'category' as const, descriptor: { mode: 'roots', limit: 8 }, key: 'c' }]])
    const page = (...ids: number[]) => ({ count: ids.length, results: ids.map(id => makeProductCategory({ id })) })
    const idsOf = (resolution: DataResolution) => (answerOf(resolution, 'c').items as Array<{ id: number }>).map(({ id }) => id)

    it('are the roots when the catalogue has several', async () => {
      backend.reply(() => page(1, 2))

      const resolution = await readData(context, planOf({ queries: roots }))

      expect(idsOf(resolution)).toEqual([1, 2])
      expect(backend.requests).toHaveLength(1)
      expect(backend.lastRequest.url.searchParams.get('isRoot')).toBe('true')
    })

    it('are the CHILDREN of the root when everything hangs under one: a single root is not a choice', async () => {
      backend.reply(request => request.url.searchParams.get('parent') === '5' ? page(6, 7) : page(5))

      const resolution = await readData(context, planOf({ queries: roots }))

      expect(idsOf(resolution)).toEqual([6, 7])
      expect(backend.requests.map(({ url }) => url.searchParams.get('parent'))).toEqual([null, '5'])
      expect(backend.lastRequest.url.searchParams.get('pageSize')).toBe('8')
    })

    it('stay the one root when it has no children to open', async () => {
      backend.reply(request => request.url.searchParams.get('parent') === '5' ? page() : page(5))

      expect(idsOf(await readData(context, planOf({ queries: roots })))).toEqual([5])
    })

    it('are the children of the category the descriptor names, and are not hoisted again', async () => {
      backend.reply(() => page(9))
      const children = new Map([['c', { source: 'category' as const, descriptor: { mode: 'children', parent: 5, limit: 8 }, key: 'c' }]])

      const resolution = await readData(context, planOf({ queries: children }))

      expect(idsOf(resolution)).toEqual([9])
      expect(backend.requests).toHaveLength(1)
      expect(backend.lastRequest.url.searchParams.get('parent')).toBe('5')
    })
  })

  it('answers `failed` for the read that failed and still answers the others', async () => {
    backend.reply(request => request.url.pathname.endsWith('/blog/post') ? jsonResponse({ detail: 'down' }, 503) : page([makeProductCard({ id: 1 })]))
    const queries = new Map([
      ['p', { source: 'product' as const, descriptor: newest, key: 'p' }],
      ['b', { source: 'blogPost' as const, descriptor: { mode: 'filter', ordering: 'newest', limit: 2 }, key: 'b' }],
    ])

    const resolution = await readData(context, planOf({ queries, ids: { ...emptyIds, blogCategory: [1] } }))

    expect(resolution.queries.get('b')).toBe('failed')
    expect(answerOf(resolution, 'p').items).toHaveLength(1)
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

describe('readData, media', () => {
  const media = (resolution: DataResolution) => resolution.records.media as ReadonlyMap<number, unknown>
  const staffHeaders = { Authorization: 'StaffBearer knox-secret-token' }

  it('reads the assets of the page in ONE request to the public resolve, as the store, with the alt text in the page\'s language', async () => {
    backend.reply(() => ({ results: [makeResolvedAsset({ id: 3 }), makeResolvedAsset({ id: 9 })] }))

    const resolution = await readData(context, planOf({ ids: { ...emptyIds, media: [9, 3, 14] } }))

    expect(backend.requests).toHaveLength(1)
    expect(backend.lastRequest.url.pathname).toBe('/api/v1/builder/media/resolve')
    expect(backend.lastRequest.url.searchParams.get('ids')).toBe('3,9,14')
    expect(backend.lastRequest.url.searchParams.get('locale')).toBe('en')
    expect(backend.lastRequest.url.searchParams.has('languageCode')).toBe(false)
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop-a.test')
    expect(backend.lastRequest.headers.get('authorization')).toBeNull()
    // 14 is not in the answer: an asset no release uses is simply absent.
    expect([...media(resolution).keys()]).toEqual([3, 9])
  })

  it('splits more ids than Django\'s resolve answers into several reads', async () => {
    backend.reply(() => ({ results: [] }))

    await readData(context, planOf({ ids: { ...emptyIds, media: Array.from({ length: DATA_MEDIA_MAX_IDS + 20 }, (_, index) => index + 1) } }))

    expect(backend.requests.map(request => request.url.searchParams.get('ids')!.split(',').length).sort((a, b) => b - a)).toEqual([DATA_MEDIA_MAX_IDS, 20])
  })

  it('answers `failed` for a read that failed, not an absence', async () => {
    backend.reply(() => jsonResponse({ detail: 'down' }, 503))

    const resolution = await readData(context, planOf({ ids: { ...emptyIds, media: [3] } }))

    expect(resolution.records.media).toBe('failed')
  })

  it('reads a share link\'s assets through its token, as nobody, and never from a cache', async () => {
    backend.reply(() => ({ results: [makeResolvedAsset({ id: 3 })] }))
    const plan = planOf({ ids: { ...emptyIds, media: [3] } })
    const shared = { ...context, shareToken: 'link-token' }

    const resolution = await readData(shared, plan)
    await readData(shared, plan)

    expect(backend.requests.map(request => request.url.pathname)).toEqual([
      '/api/v1/builder/preview-media/link-token',
      '/api/v1/builder/preview-media/link-token',
    ])
    expect(backend.lastRequest.url.searchParams.get('ids')).toBe('3')
    expect(backend.lastRequest.url.searchParams.get('locale')).toBe('en')
    expect(backend.lastRequest.headers.get('authorization')).toBeNull()
    expect([...media(resolution).keys()]).toEqual([3])
  })

  it('answers failed when a share link has gone, rather than taking its images for absent', async () => {
    backend.reply(() => jsonResponse({ code: 'preview_link_expired' }, 404))

    const resolution = await readData({ ...context, shareToken: 'gone' }, planOf({ ids: { ...emptyIds, media: [3] } }))

    expect(resolution.records.media).toBe('failed')
  })

  it('reads any asset of the library for the editor\'s preview: the staff resolve, as the staff member', async () => {
    backend.reply(() => ({ results: [makeResolvedAsset({ id: 3 })] }))

    const resolution = await readData({ ...context, staffHeaders }, planOf({ ids: { ...emptyIds, media: [3] } }))

    expect(backend.lastRequest.url.pathname).toBe('/api/v1/builder/media/staff-resolve')
    expect(backend.lastRequest.url.searchParams.get('ids')).toBe('3')
    expect(backend.lastRequest.url.searchParams.get('locale')).toBe('en')
    expect(backend.lastRequest.headers.get('authorization')).toBe(staffHeaders.Authorization)
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop-a.test')
    expect([...media(resolution).keys()]).toEqual([3])
  })

  it('never caches a staff read, and never lets a public read see one: each read asks Django', async () => {
    backend.reply(() => ({ results: [makeResolvedAsset({ id: 3 })] }))
    const plan = planOf({ ids: { ...emptyIds, media: [3] } })

    await readData({ ...context, staffHeaders }, plan)
    await readData({ ...context, staffHeaders }, plan)
    await readData(context, plan)

    expect(backend.requests.map(request => request.url.pathname)).toEqual([
      '/api/v1/builder/media/staff-resolve',
      '/api/v1/builder/media/staff-resolve',
      '/api/v1/builder/media/resolve',
    ])
    expect(backend.requests.map(request => request.headers.get('authorization'))).toEqual([staffHeaders.Authorization, staffHeaders.Authorization, null])
  })

  it('sends no staff credentials for any other kind of record', async () => {
    backend.reply(() => page([makeProductCard({ id: 2 })]))

    await readData({ ...context, staffHeaders }, planOf({ ids: { ...emptyIds, product: [2] } }))

    expect(backend.lastRequest.url.pathname).toBe('/api/v1/product')
    expect(backend.lastRequest.headers.get('authorization')).toBeNull()
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

  it('keeps the name Django\'s purge of the builder surface evicts, and keys the public media read on the store and the language', () => {
    const { getKey } = cacheOptionsOf(readMedia)
    if (!getKey) throw new Error('A read must state its key')

    expect(cacheOptionsOf(readMedia)).toMatchObject({ name: 'builderDataMedia', maxAge: 60, swr: false })
    expect(getKey('shop-a.test', 'en', { ids: '3' })).not.toBe(getKey('shop-b.test', 'en', { ids: '3' }))
    expect(getKey('shop-a.test', 'en', { ids: '3' })).not.toBe(getKey('shop-a.test', 'el', { ids: '3' }))
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
