import { describe, expect, it, vi } from 'vitest'
import { tenantCacheKey } from '../../../../../server/utils/cacheKey'

// server/api/products/[id]/variants.get.ts registers a cached event handler
// at module scope and leans on Nitro auto-imports — provide them as globals
// before the dynamic import below. The stub captures `getKey` so the test
// can call it directly instead of standing up a full h3 event.
vi.stubGlobal('defineCachedEventHandler', (fn: unknown, options?: { getKey?: (event: unknown) => string }) => {
  if (options?.getKey) Object.assign(fn as object, { getKey: options.getKey })
  return fn
})

// Use the real tenantCacheKey so this test also exercises the actual
// host-prefixing behavior, not just that it was called.
vi.stubGlobal('tenantCacheKey', tenantCacheKey)

const routerParamMock = vi.fn()
vi.stubGlobal('getRouterParam', routerParamMock)

const hostMock = vi.fn()
vi.stubGlobal('getRequestHost', hostMock)

const handler = (await import('../../../../../server/api/products/[id]/variants.get')).default as unknown as {
  getKey: (event: unknown) => string
}

describe('GET /api/products/[id]/variants cache key', () => {
  it('differentiates keys for two tenants requesting the same product id', () => {
    routerParamMock.mockReturnValue('42')

    hostMock.mockReturnValueOnce('tenant-a.example')
    const keyA = handler.getKey({})

    hostMock.mockReturnValueOnce('tenant-b.example')
    const keyB = handler.getKey({})

    expect(keyA).not.toBe(keyB)
    // tenantCacheKey appends a word-safe hash suffix (survives Nitro's
    // \W-stripping) — assert on the readable prefix, not exact equality.
    expect(keyA.startsWith('tenant-a.example:product-variants:42')).toBe(true)
    expect(keyB.startsWith('tenant-b.example:product-variants:42')).toBe(true)
  })
})
