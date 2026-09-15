import { describe, expect, it, vi } from 'vitest'
import { tenantCacheKey } from '../../../../server/utils/cacheKey'

// Same stubbing approach as promotions.spec.ts: the route registers a
// cached handler at module scope and leans on Nitro auto-imports, so the
// stub captures `getKey` and the test calls it directly rather than
// standing up a full h3 event.
vi.stubGlobal('defineCachedEventHandler', (fn: unknown, options?: { getKey?: (event: unknown) => string }) => {
  if (options?.getKey) Object.assign(fn as object, { getKey: options.getKey })
  return fn
})

vi.stubGlobal('tenantCacheKey', tenantCacheKey)

const hostMock = vi.fn()
vi.stubGlobal('getRequestHost', hostMock)

const paramMock = vi.fn()
vi.stubGlobal('getRouterParam', paramMock)

const handler = (await import('../../../../server/api/promotions/product/[productId].get')).default as unknown as {
  getKey: (event: unknown) => string
}

describe('GET /api/promotions/product/:productId cache key', () => {
  it('differentiates keys per tenant (no cross-tenant offer leak)', () => {
    // A product id is only unique WITHIN a schema: two tenants both
    // have a product 2, and serving one store's offers for the other's
    // product 2 would publish a discount it never authored.
    paramMock.mockReturnValue('2')

    hostMock.mockReturnValueOnce('tenant-a.example')
    const keyA = handler.getKey({})

    hostMock.mockReturnValueOnce('tenant-b.example')
    const keyB = handler.getKey({})

    expect(keyA).not.toBe(keyB)
  })

  it('differentiates keys per product', () => {
    hostMock.mockReturnValue('tenant-a.example')

    paramMock.mockReturnValueOnce('2')
    const first = handler.getKey({})

    paramMock.mockReturnValueOnce('3')
    const second = handler.getKey({})

    expect(first).not.toBe(second)
    expect(first).toContain('promotions:product:2')
    expect(second).toContain('promotions:product:3')
  })

  it('is stable for the same tenant and product', () => {
    hostMock.mockReturnValue('tenant-a.example')
    paramMock.mockReturnValue('2')

    expect(handler.getKey({})).toBe(handler.getKey({}))
  })
})
