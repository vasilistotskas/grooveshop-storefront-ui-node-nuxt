import { describe, it, expect, vi } from 'vitest'
import { tenantCacheKey } from '../../../../server/utils/cacheKey'

// Stub Nuxt's auto-imported `getRequestHost` to an inspectable mock so
// we can drive it per-test without standing up a full h3 event.
const hostMock = vi.fn()
vi.stubGlobal('getRequestHost', hostMock)

/**
 * Nitro passes custom getKey results through
 * `escapeKey = (key) => String(key).replace(/\W/g, '')` before using
 * them as storage keys (nitropack/dist/runtime/internal/cache.mjs).
 * Assertions about uniqueness must therefore hold on the ESCAPED
 * form, not the raw return value.
 */
function nitroEscape(key: string): string {
  return key.replace(/\W/g, '')
}

describe('tenantCacheKey', () => {
  it('starts with the request host and inner key', () => {
    hostMock.mockReturnValueOnce('webside.gr')
    const key = tenantCacheKey({} as any, 'product-categories:el')
    expect(key.startsWith('webside.gr:product-categories:el')).toBe(true)
  })

  it('differentiates keys for two tenants sharing the same inner key', () => {
    hostMock.mockReturnValueOnce('tenant-a.example')
    const a = tenantCacheKey({} as any, 'search:products:laptop')
    hostMock.mockReturnValueOnce('tenant-b.example')
    const b = tenantCacheKey({} as any, 'search:products:laptop')
    expect(nitroEscape(a)).not.toBe(nitroEscape(b))
  })

  it('keeps punctuation-equivalent tenant hosts distinct AFTER Nitro escaping', () => {
    // Without the hash suffix, `my-store.gr` and `mystore.gr` both
    // escape to `mystoregr…` and would share every cached response —
    // a cross-tenant data leak.
    hostMock.mockReturnValueOnce('my-store.gr')
    const a = tenantCacheKey({} as any, 'settings')
    hostMock.mockReturnValueOnce('mystore.gr')
    const b = tenantCacheKey({} as any, 'settings')
    expect(nitroEscape(a)).not.toBe(nitroEscape(b))
  })

  it('keeps punctuation-only key differences distinct AFTER Nitro escaping', () => {
    // `ordering=-price` vs `ordering=price` previously escaped to the
    // same storage key, so ascending and descending sorts shared one
    // cache entry.
    hostMock.mockReturnValue('webside.gr')
    const asc = tenantCacheKey({} as any, 'products:ordering=price')
    const desc = tenantCacheKey({} as any, 'products:ordering=-price')
    expect(nitroEscape(asc)).not.toBe(nitroEscape(desc))
  })

  it('is deterministic for identical inputs', () => {
    hostMock.mockReturnValue('webside.gr')
    const a = tenantCacheKey({} as any, 'products:page=1')
    const b = tenantCacheKey({} as any, 'products:page=1')
    expect(a).toBe(b)
  })

  it('hash suffix consists of word characters only (survives escaping intact)', () => {
    hostMock.mockReturnValueOnce('webside.gr')
    const key = tenantCacheKey({} as any, 'anything')
    const suffix = key.split('_').pop()!
    expect(suffix).toMatch(/^[a-z0-9]+$/)
  })

  it('ignores X-Forwarded-Host (callers use the raw request host)', () => {
    // Safety net against spoofing: the helper forwards a fixed option
    // so a malicious X-Forwarded-Host cannot hop tenants in the cache.
    hostMock.mockReturnValueOnce('webside.gr')
    tenantCacheKey({} as any, 'any')
    expect(hostMock).toHaveBeenCalledWith({}, { xForwardedHost: false })
  })
})
