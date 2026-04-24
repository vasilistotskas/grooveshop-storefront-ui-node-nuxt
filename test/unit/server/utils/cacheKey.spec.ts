import { describe, it, expect, vi } from 'vitest'
import { tenantCacheKey } from '../../../../server/utils/cacheKey'

// Stub Nuxt's auto-imported `getRequestHost` to an inspectable mock so
// we can drive it per-test without standing up a full h3 event.
const hostMock = vi.fn()
vi.stubGlobal('getRequestHost', hostMock)

describe('tenantCacheKey', () => {
  it('prepends the request host to the key', () => {
    hostMock.mockReturnValueOnce('webside.gr')
    const key = tenantCacheKey({} as any, 'product-categories:el')
    expect(key).toBe('webside.gr:product-categories:el')
  })

  it('differentiates keys for two tenants sharing the same inner key', () => {
    hostMock.mockReturnValueOnce('tenant-a.example')
    const a = tenantCacheKey({} as any, 'search:products:laptop')
    hostMock.mockReturnValueOnce('tenant-b.example')
    const b = tenantCacheKey({} as any, 'search:products:laptop')
    expect(a).not.toBe(b)
  })

  it('ignores X-Forwarded-Host (callers use the raw request host)', () => {
    // Safety net against spoofing: the helper forwards a fixed option
    // so a malicious X-Forwarded-Host cannot hop tenants in the cache.
    hostMock.mockReturnValueOnce('webside.gr')
    tenantCacheKey({} as any, 'any')
    expect(hostMock).toHaveBeenCalledWith({}, { xForwardedHost: false })
  })
})
