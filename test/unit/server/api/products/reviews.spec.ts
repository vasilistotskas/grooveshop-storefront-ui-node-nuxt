import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tenantCacheKey } from '../../../../../server/utils/cacheKey'
import {
  zListProductReviewsPath,
  zListProductReviewsQuery,
  zListProductReviewsResponse,
} from '../../../../../shared/openapi/zod.gen'

// The route registers a cached event handler at module scope and leans on
// Nitro auto-imports — provide them as globals before the dynamic import
// (variants.spec.ts pattern). The stub keeps `getKey` reachable.
vi.stubGlobal('defineCachedEventHandler', (fn: unknown, options?: { getKey?: (event: unknown) => string }) => {
  if (options?.getKey) Object.assign(fn as object, { getKey: options.getKey })
  return fn
})
vi.stubGlobal('tenantCacheKey', tenantCacheKey)
vi.stubGlobal('useRuntimeConfig', () => ({ apiBaseUrl: 'http://django/api/v1' }))
vi.stubGlobal('createHeaders', () => ({}))
vi.stubGlobal('parseDataAs', async (data: unknown) => data)
vi.stubGlobal('handleError', (error: unknown) => {
  throw error
})
vi.stubGlobal('getValidatedRouterParams', async (_event: unknown, parse: (v: unknown) => unknown) => parse({ id: '42' }))
// The REAL generated query schema: the proxy forwards exactly the keys
// the API advertises, and this pins that `ordering` is one of them.
vi.stubGlobal('zListProductReviewsQuery', zListProductReviewsQuery)
vi.stubGlobal('zListProductReviewsPath', zListProductReviewsPath)
vi.stubGlobal('zListProductReviewsResponse', zListProductReviewsResponse)

let query: Record<string, unknown> = {}
vi.stubGlobal('getQuery', () => query)
vi.stubGlobal('getValidatedQuery', async (_event: unknown, parse: (v: unknown) => unknown) => parse(query))
const routerParamMock = vi.fn(() => '42')
vi.stubGlobal('getRouterParam', routerParamMock)
const hostMock = vi.fn(() => 'webside.gr')
vi.stubGlobal('getRequestHost', hostMock)
const fetchMock = vi.fn(async () => ({ results: [] }))
vi.stubGlobal('$fetch', fetchMock)

const handler = (await import('../../../../../server/api/products/[id]/reviews.get')).default as unknown as ((
  event: unknown,
) => Promise<unknown>) & { getKey: (event: unknown) => string }

describe('GET /api/products/[id]/reviews', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    query = {}
  })

  it('forwards the page and ordering the product page asked for', async () => {
    query = { ordering: '-rate', page: '2', pageSize: '6' }

    await handler({})

    expect(fetchMock).toHaveBeenCalledWith(
      'http://django/api/v1/product/42/reviews',
      expect.objectContaining({ query: expect.objectContaining({ ordering: '-rate', page: '2', pageSize: '6' }) }),
    )
  })

  it('keys the cache by the query, so two sorts never share an entry', () => {
    query = { ordering: 'createdAt' }
    const ascending = handler.getKey({})
    query = { ordering: '-createdAt' }
    const descending = handler.getKey({})

    expect(ascending).not.toBe(descending)
    expect(ascending.startsWith('webside.gr__product-reviews:42:')).toBe(true)
  })
})
