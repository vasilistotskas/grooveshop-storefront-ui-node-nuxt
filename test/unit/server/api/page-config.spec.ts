import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FetchError } from 'ofetch'
import { tenantCacheKey } from '../../../../server/utils/cacheKey'
import { parseDataAs } from '../../../../server/utils/parser'
import { zPageLayout } from '../../../../shared/openapi/zod.gen'
import type { PageConfigResponse } from '../../../../shared/types/pageConfig'

// The route registers a cached event handler at module scope and leans on
// Nitro auto-imports — provide them as globals before the dynamic import
// below (content-pages.spec.ts / feedback.spec.ts pattern). The stub keeps
// `getKey` reachable so the cache-key assertions can call it directly.
vi.stubGlobal('defineCachedEventHandler', (fn: unknown, options?: { getKey?: (event: unknown) => string }) => {
  if (options?.getKey) Object.assign(fn as object, { getKey: options.getKey })
  return fn
})
vi.stubGlobal('tenantCacheKey', tenantCacheKey)
vi.stubGlobal('useRuntimeConfig', () => ({ apiBaseUrl: 'http://django/api/v1' }))

const routerParamMock = vi.fn()
vi.stubGlobal('getRouterParam', routerParamMock)
const hostMock = vi.fn()
vi.stubGlobal('getRequestHost', hostMock)

const backendFetchMock = vi.fn()
vi.stubGlobal('useBackendFetch', () => backendFetchMock)
// The REAL parser + generated schema, so the test also proves the route's
// success contract matches the OpenAPI schema.
vi.stubGlobal('parseDataAs', parseDataAs)
vi.stubGlobal('zPageLayout', zPageLayout)
// Prop sanitising has its own contract; here it only needs to pass through.
vi.stubGlobal('parseSectionProps', (_type: string, props: unknown) => ({ props: props ?? {} }))

const logMock = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
vi.stubGlobal('log', logMock)

class HandledError extends Error {}
const handleErrorMock = vi.fn((error: unknown) => {
  throw new HandledError(`handled: ${String(error)}`)
})
vi.stubGlobal('handleError', handleErrorMock)

const handler = (await import('../../../../server/api/page-config/[pageType].get')).default as unknown as ((
  event: unknown,
) => Promise<PageConfigResponse>) & { getKey: (event: unknown) => string }

const LAYOUT = {
  id: 7,
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  pageType: 'products',
  title: 'Products band',
  isPublished: true,
  metadata: {},
  sections: [
    {
      id: 1,
      uuid: '550e8400-e29b-41d4-a716-446655440001',
      componentType: 'hero_banner',
      title: '',
      isVisible: true,
      props: { headline: 'Summer' },
      sortOrder: 0,
    },
  ],
}

function upstreamError(statusCode: number) {
  const error = new FetchError(`[GET] "http://django/api/v1/page-config/products": ${statusCode}`)
  error.statusCode = statusCode
  return error
}

describe('GET /api/page-config/[pageType]', () => {
  beforeEach(() => {
    backendFetchMock.mockReset()
    handleErrorMock.mockClear()
    logMock.warn.mockClear()
    routerParamMock.mockReturnValue('products')
    hostMock.mockReturnValue('tenant-a.example')
  })

  it('wraps a published layout in the response envelope', async () => {
    backendFetchMock.mockResolvedValue(LAYOUT)

    const result = await handler({})

    expect(backendFetchMock).toHaveBeenCalledWith(
      'http://django/api/v1/page-config/products',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result.layout?.pageType).toBe('products')
    expect(result.layout?.sections).toHaveLength(1)
    expect(result.layout?.sections[0]?.props).toEqual({ headline: 'Summer' })
    expect(handleErrorMock).not.toHaveBeenCalled()
  })

  it('returns { layout: null } for an upstream 404 without logging or throwing', async () => {
    // Django's 404 is "no PUBLISHED layout for this page type" — the
    // documented state for every page type defaults.py does not seed.
    // It has to come back as DATA so the SWR cache stores it and the
    // request log stays clean; a thrown error is never cached and every
    // SSR of /products and /blog paid a Django round-trip plus a
    // warn + stack trace.
    backendFetchMock.mockRejectedValue(upstreamError(404))

    const result = await handler({})

    expect(result).toEqual({ layout: null })
    expect(handleErrorMock).not.toHaveBeenCalled()
    expect(logMock.warn).not.toHaveBeenCalled()
    expect(logMock.error).not.toHaveBeenCalled()
  })

  it('still propagates an upstream 5xx so callers can tell an outage from an absent layout', async () => {
    // about.vue / [slug].vue answer 503 for a backend outage and 404 for
    // a genuinely absent layout; collapsing a 503 into { layout: null }
    // would turn every outage into a soft "no layout" page.
    backendFetchMock.mockRejectedValue(upstreamError(503))

    await expect(handler({})).rejects.toBeInstanceOf(HandledError)
    expect(handleErrorMock).toHaveBeenCalledTimes(1)
  })

  it('propagates a schema mismatch instead of masking it as an absent layout', async () => {
    backendFetchMock.mockResolvedValue({ ...LAYOUT, sections: 'not-a-list' })

    await expect(handler({})).rejects.toBeInstanceOf(HandledError)
    expect(handleErrorMock).toHaveBeenCalledTimes(1)
  })

  it('propagates a network failure (no status) instead of masking it as an absent layout', async () => {
    backendFetchMock.mockRejectedValue(new FetchError('fetch failed'))

    await expect(handler({})).rejects.toBeInstanceOf(HandledError)
    expect(handleErrorMock).toHaveBeenCalledTimes(1)
  })
})

describe('GET /api/page-config/[pageType] cache key', () => {
  it('differentiates keys for two tenants requesting the same page type (no cross-tenant leak)', () => {
    routerParamMock.mockReturnValue('products')

    hostMock.mockReturnValueOnce('tenant-a.example')
    const keyA = handler.getKey({})
    hostMock.mockReturnValueOnce('tenant-b.example')
    const keyB = handler.getKey({})

    expect(keyA).not.toBe(keyB)
    expect(keyA.startsWith('tenant-a.example:page-config:products')).toBe(true)
    expect(keyB.startsWith('tenant-b.example:page-config:products')).toBe(true)
  })

  it('differentiates keys for two page types on the same tenant', () => {
    hostMock.mockReturnValue('tenant-a.example')

    routerParamMock.mockReturnValueOnce('products')
    const keyProducts = handler.getKey({})
    routerParamMock.mockReturnValueOnce('blog')
    const keyBlog = handler.getKey({})

    expect(keyProducts).not.toBe(keyBlog)
  })
})
