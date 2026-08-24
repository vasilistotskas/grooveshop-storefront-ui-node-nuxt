import { describe, expect, it, vi } from 'vitest'
import { tenantCacheKey } from '../../../../server/utils/cacheKey'

// Both content-pages routes register cached event handlers at module scope
// and lean on Nitro auto-imports — provide them as globals before the
// dynamic imports below. The stub captures `getKey` so the test can call
// it directly instead of standing up a full h3 event.
vi.stubGlobal('defineCachedEventHandler', (fn: unknown, options?: { getKey?: (event: unknown) => string }) => {
  if (options?.getKey) Object.assign(fn as object, { getKey: options.getKey })
  return fn
})

// Use the real tenantCacheKey so this test also exercises the actual
// host-prefixing behavior, not just that it was called.
vi.stubGlobal('tenantCacheKey', tenantCacheKey)

const routerParamsMock = vi.fn()
vi.stubGlobal('getRouterParams', routerParamsMock)

const queryMock = vi.fn()
vi.stubGlobal('getQuery', queryMock)

const hostMock = vi.fn()
vi.stubGlobal('getRequestHost', hostMock)

const detailHandler = (await import('../../../../server/api/content-pages/[slug].get')).default as unknown as {
  getKey: (event: unknown) => string
}
const listHandler = (await import('../../../../server/api/content-pages/index.get')).default as unknown as {
  getKey: (event: unknown) => string
}

describe('GET /api/content-pages/[slug] cache key', () => {
  it('differentiates keys for two tenants requesting the same slug (no cross-tenant leak)', () => {
    routerParamsMock.mockReturnValue({ slug: 'about-us' })

    hostMock.mockReturnValueOnce('tenant-a.example')
    const keyA = detailHandler.getKey({})

    hostMock.mockReturnValueOnce('tenant-b.example')
    const keyB = detailHandler.getKey({})

    expect(keyA).not.toBe(keyB)
    // tenantCacheKey appends a word-safe hash suffix (survives Nitro's
    // \W-stripping) — assert on the readable prefix, not exact equality.
    expect(keyA.startsWith('tenant-a.example:content-page:about-us')).toBe(true)
    expect(keyB.startsWith('tenant-b.example:content-page:about-us')).toBe(true)
  })

  it('differentiates keys for two slugs on the same tenant', () => {
    hostMock.mockReturnValue('tenant-a.example')

    routerParamsMock.mockReturnValueOnce({ slug: 'about-us' })
    const keyAbout = detailHandler.getKey({})

    routerParamsMock.mockReturnValueOnce({ slug: 'faq' })
    const keyFaq = detailHandler.getKey({})

    expect(keyAbout).not.toBe(keyFaq)
  })
})

describe('GET /api/content-pages cache key', () => {
  it('differentiates keys for two tenants requesting the same query (no cross-tenant leak)', () => {
    queryMock.mockReturnValue({ page: '1' })

    hostMock.mockReturnValueOnce('tenant-a.example')
    const keyA = listHandler.getKey({})

    hostMock.mockReturnValueOnce('tenant-b.example')
    const keyB = listHandler.getKey({})

    expect(keyA).not.toBe(keyB)
    expect(keyA.startsWith('tenant-a.example:content-pages:')).toBe(true)
    expect(keyB.startsWith('tenant-b.example:content-pages:')).toBe(true)
  })

  it('differentiates keys for different ordering query params', () => {
    hostMock.mockReturnValue('tenant-a.example')

    queryMock.mockReturnValueOnce({ ordering: 'slug' })
    const keyAsc = listHandler.getKey({})

    queryMock.mockReturnValueOnce({ ordering: '-slug' })
    const keyDesc = listHandler.getKey({})

    expect(keyAsc).not.toBe(keyDesc)
  })
})
