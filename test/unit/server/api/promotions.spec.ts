import { describe, expect, it, vi } from 'vitest'
import { tenantCacheKey } from '../../../../server/utils/cacheKey'

// The route registers a cached event handler at module scope and leans on
// Nitro auto-imports — provide them as globals before the dynamic import
// below. The stub captures `getKey` so the test can call it directly
// instead of standing up a full h3 event (content-pages.spec.ts pattern).
vi.stubGlobal('defineCachedEventHandler', (fn: unknown, options?: { getKey?: (event: unknown) => string }) => {
  if (options?.getKey) Object.assign(fn as object, { getKey: options.getKey })
  return fn
})

// The real implementation, so this also exercises actual host-prefixing.
vi.stubGlobal('tenantCacheKey', tenantCacheKey)

const hostMock = vi.fn()
vi.stubGlobal('getRequestHost', hostMock)

const handler = (await import('../../../../server/api/promotions/index.get')).default as unknown as {
  getKey: (event: unknown) => string
}

describe('GET /api/promotions cache key', () => {
  it('differentiates keys per tenant (no cross-tenant offer leak)', () => {
    // Offers are commercial and tenant-specific: one store's coupon
    // codes served from another store's cache would publish a discount
    // the second store never authored.
    hostMock.mockReturnValueOnce('tenant-a.example')
    const keyA = handler.getKey({})

    hostMock.mockReturnValueOnce('tenant-b.example')
    const keyB = handler.getKey({})

    expect(keyA).not.toBe(keyB)
    expect(keyA).toContain('promotions:public')
    expect(keyB).toContain('promotions:public')
  })

  it('is stable for the same tenant', () => {
    hostMock.mockReturnValue('tenant-a.example')

    expect(handler.getKey({})).toBe(handler.getKey({}))
  })
})
