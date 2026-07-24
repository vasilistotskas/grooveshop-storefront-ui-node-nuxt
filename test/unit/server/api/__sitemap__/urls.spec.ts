/**
 * Unit tests for server/api/__sitemap__/urls.ts
 *
 * Verifies that blog URLs are excluded from the sitemap when the tenant
 * has blogEnabled=false, so disabled tenants do not leak their blog URL
 * surface in search engines.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Nuxt/Nitro global stubs ---

vi.stubGlobal('useRuntimeConfig', () => ({
  public: { baseUrl: 'https://example.com', mediaStreamPath: 'https://media.example.com' },
  apiBaseUrl: 'https://api.example.com/api/v1',
}))

vi.stubGlobal('getRequestHost', () => 'example.com')

// This route is bypassed in 0.tenant.ts, so it resolves tenant context
// itself via getTenantConfig() when event.context.tenant is absent.
const getTenantConfigMock = vi.fn()
vi.stubGlobal('getTenantConfig', getTenantConfigMock)

// asSitemapUrl just returns its argument
vi.stubGlobal('asSitemapUrl', (url: unknown) => url)

// defineSitemapEventHandler executes the handler directly so we can call it
vi.stubGlobal('defineSitemapEventHandler', (fn: (event: unknown) => unknown) => fn)

// Minimal blog/product fixture data
const BLOG_POST = { id: 1, slug: 'my-post', updatedAt: new Date().toISOString() }
const BLOG_CATEGORY = { id: 10, slug: 'tech', updatedAt: new Date().toISOString() }
const PRODUCT = { id: 100, slug: 'my-product', updatedAt: new Date().toISOString(), active: true, mainImagePath: '', translations: {} }
const PRODUCT_CATEGORY = { id: 200, slug: 'electronics', updatedAt: new Date().toISOString() }

// createCachedFetcher factory: first call sets the mock data, subsequent calls
// per name are re-used. We store per-name returns so blog vs product are separate.
const cachedFetcherData: Record<string, unknown[]> = {}

vi.stubGlobal('createCachedFetcher', (_name: string, _ttl: number) => {
  return async (tenantKey: string, url: string) => {
    if (url.includes('/blog/post')) return cachedFetcherData['posts'] ?? [BLOG_POST]
    if (url.includes('/blog/category')) return cachedFetcherData['categories'] ?? [BLOG_CATEGORY]
    if (url.includes('/product/category')) return cachedFetcherData['productCategories'] ?? [PRODUCT_CATEGORY]
    if (url.includes('/product')) return cachedFetcherData['products'] ?? [PRODUCT]
    return []
  }
})

const module = await import('../../../../../server/api/__sitemap__/urls')
const handler = (module.default ?? module) as unknown as (event: unknown) => Promise<unknown[]>

function makeEvent(blogEnabled: boolean) {
  return {
    context: {
      tenant: { blogEnabled, primaryDomain: 'example.com' },
    },
  }
}

describe('server/api/__sitemap__/urls — blog feature gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes blog post and category URLs when blogEnabled is true', async () => {
    const urls = await handler(makeEvent(true)) as Array<{ loc: string }>
    const locs = urls.map(u => u.loc)

    expect(locs.some(l => l.includes('/blog/post/'))).toBe(true)
    expect(locs.some(l => l.includes('/blog/category/'))).toBe(true)
    expect(locs.some(l => l.includes('/products/'))).toBe(true)
  })

  it('excludes all blog URLs when blogEnabled is false', async () => {
    const urls = await handler(makeEvent(false)) as Array<{ loc: string }>
    const locs = urls.map(u => u.loc)

    expect(locs.some(l => l.includes('/blog/'))).toBe(false)
    // Products are still included
    expect(locs.some(l => l.includes('/products/'))).toBe(true)
  })
})

describe('server/api/__sitemap__/urls — tenant resolution (bypassed route)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves tenant via getTenantConfig when event.context.tenant is absent, honoring its blogEnabled', async () => {
    getTenantConfigMock.mockResolvedValueOnce({
      type: 'ok',
      config: { blogEnabled: false, primaryDomain: 'example.com' },
    })

    const urls = await handler({ context: {} }) as Array<{ loc: string }>
    const locs = urls.map(u => u.loc)

    expect(getTenantConfigMock).toHaveBeenCalledWith('example.com')
    expect(locs.some(l => l.includes('/blog/'))).toBe(false)
    expect(locs.some(l => l.includes('/products/'))).toBe(true)
  })

  it('falls back to blogEnabled=true when tenant resolution fails (404/5xx)', async () => {
    getTenantConfigMock.mockResolvedValueOnce({ type: 'not_found', config: null })

    const urls = await handler({ context: {} }) as Array<{ loc: string }>
    const locs = urls.map(u => u.loc)

    expect(locs.some(l => l.includes('/blog/post/'))).toBe(true)
  })
})
