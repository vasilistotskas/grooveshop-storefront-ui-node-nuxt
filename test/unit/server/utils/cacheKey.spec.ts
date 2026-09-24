import { describe, it, expect, vi } from 'vitest'
import {
  cacheKeyBelongsToHost,
  hashedCacheKey,
  nitroVaryHash,
  tenantCacheKey,
} from '../../../../server/utils/cacheKey'

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

/** An event whose request locale is `locale` (`event.context.locale`). */
function onLocale(locale?: string): any {
  return { context: locale ? { locale } : {} }
}

describe('tenantCacheKey', () => {
  it('starts with the request host, the locale, the delimiters and the inner key', () => {
    hostMock.mockReturnValueOnce('webside.gr')
    const key = tenantCacheKey(onLocale('en'), 'product-detail:7')
    expect(key.startsWith('webside.gr__en__product-detail:7')).toBe(true)
  })

  it('keys the same route per locale, so an en entry is never served to el', () => {
    // Django answers in the X-Language it is sent and returns flat text
    // in it (product attributes, variant axes): one entry per language.
    hostMock.mockReturnValue('webside.gr')
    const el = tenantCacheKey(onLocale('el'), 'product-detail:7')
    const en = tenantCacheKey(onLocale('en'), 'product-detail:7')
    expect(nitroEscape(el)).not.toBe(nitroEscape(en))
  })

  it('uses the default locale when the context has none', () => {
    hostMock.mockReturnValue('webside.gr')
    expect(tenantCacheKey(onLocale(), 'settings'))
      .toBe(tenantCacheKey(onLocale('el'), 'settings'))
  })

  it('keeps the host first, so a store-scoped purge still matches every locale', () => {
    hostMock.mockReturnValue('webside.gr')
    for (const locale of ['el', 'en']) {
      const stored = `nitro:handlers:ProductDetailViewSet:${nitroEscape(tenantCacheKey(onLocale(locale), 'product-detail:7'))}.json`
      expect(cacheKeyBelongsToHost(stored, 'webside.gr')).toBe(true)
      expect(cacheKeyBelongsToHost(stored, 'other.gr')).toBe(false)
    }
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

describe('nitroVaryHash', () => {
  // Copied from the production keyspace on 2026-09-18
  // (`cache:<buildId>:nitro:routes:_:<path>.<hash>:host.<hash>:…`), one
  // per live tenant. Nitro computes them in
  // nitropack/dist/runtime/internal/hash.mjs; if a Nitro upgrade changed
  // the recipe these would fail here instead of every tenant-scoped page
  // purge silently matching nothing.
  it.each([
    ['webside.gr', 'L7PoZKHFRT'],
    ['demo.grooveshop.space', 'uGk9nD1HSf'],
    ['fyteia.grooveshop.space', 'QKVOqD0FHL'],
    ['delta-sigma.grooveshop.space', 'kyxDLa4pMO'],
  ])('reproduces the live vary token for %s', (host, token) => {
    expect(nitroVaryHash(host)).toBe(token)
  })
})

describe('cacheKeyBelongsToHost', () => {
  // Every key shape below is a live production key (2026-09-18) with
  // only the `cache:<buildId>:` mount prefix removed, which is how the
  // purge endpoint sees them through `useStorage('cache')`.
  const HOST = 'webside.gr'

  describe('nitro:handlers (defineCachedEventHandler + tenantCacheKey)', () => {
    const handlerKey = (host: string, inner: string) => {
      hostMock.mockReturnValueOnce(host)
      return `nitro:handlers:pageConfig:${nitroEscape(tenantCacheKey({} as any, inner))}.json`
    }

    it('claims the tenant\'s own handler entry', () => {
      expect(cacheKeyBelongsToHost(handlerKey(HOST, 'page-config:products:el'), HOST)).toBe(true)
    })

    it('leaves another store\'s entry alone', () => {
      expect(cacheKeyBelongsToHost(handlerKey('demo.grooveshop.space', 'page-config:products:el'), HOST)).toBe(false)
    })

    it('does not let a host claim a longer host that escapes to the same prefix', () => {
      // `shop.gr` and `shop.gr.com` both escape to `shopgr…`; only the
      // delimiter after the host tells them apart.
      expect(cacheKeyBelongsToHost(handlerKey('shop.gr.com', 'settings'), 'shop.gr')).toBe(false)
      expect(cacheKeyBelongsToHost(handlerKey('shop.gr', 'settings'), 'shop.gr')).toBe(true)
    })

    it('treats a handler that never called tenantCacheKey as nobody\'s', () => {
      expect(cacheKeyBelongsToHost('nitro:handlers:health:default.json', HOST)).toBe(false)
    })
  })

  describe('nitro:routes (route-rule cache with varies: [host, x-device-class])', () => {
    const WEBSIDE_HOME = 'nitro:routes:_:index.5C7pMjIeqU:host.L7PoZKHFRT:xdeviceclass.aGk9AqtPuy.json'
    const DEMO_PRODUCTS = 'nitro:routes:_:products20demosc.EnOHlnel5C:host.uGk9nD1HSf:xdeviceclass.aGk9AqtPuy.json'

    it('claims a page rendered for the tenant', () => {
      expect(cacheKeyBelongsToHost(WEBSIDE_HOME, HOST)).toBe(true)
    })

    it('leaves another tenant\'s render alone', () => {
      expect(cacheKeyBelongsToHost(DEMO_PRODUCTS, HOST)).toBe(false)
      expect(cacheKeyBelongsToHost(DEMO_PRODUCTS, 'demo.grooveshop.space')).toBe(true)
    })

    it('never matches the escaped host — Nitro hashes vary headers', () => {
      // The pre-fix filter looked for `websidegr` inside the key; no
      // route key contains it, which is why page purges matched nothing.
      expect(WEBSIDE_HOME.includes('websidegr')).toBe(false)
    })
  })

  describe('nitro:functions (defineCachedFunction keyed on the raw host)', () => {
    const WEBSIDE_SITEMAP = 'nitro:functions:sitemap:products:webside.gr:http:backend-service:80:api:v1:product'
    const FYTEIA_SITEMAP = 'nitro:functions:sitemap:products:fyteia.grooveshop.space:http:backend-service:80:api:v1:product'

    it('claims the tenant\'s own feed', () => {
      expect(cacheKeyBelongsToHost(WEBSIDE_SITEMAP, HOST)).toBe(true)
    })

    it('leaves another tenant\'s feed alone', () => {
      expect(cacheKeyBelongsToHost(FYTEIA_SITEMAP, HOST)).toBe(false)
    })

    it('matches the host as a whole segment, so a suffix host cannot claim it', () => {
      expect(cacheKeyBelongsToHost(WEBSIDE_SITEMAP, 'side.gr')).toBe(false)
    })

    it('matches a host that is the final segment (loyalty summary)', () => {
      expect(cacheKeyBelongsToHost('nitro:functions:LoyaltySummaryAnon:loyalty:summary:anon:webside.gr.json', HOST)).toBe(true)
    })

    it('matches a hashed function key that keeps its query string', () => {
      const key = `nitro:functions:cachedBlogCategory:${hashedCacheKey('webside.gr:http://backend-service:80/api/v1/blog/category/3')}.json`
      expect(cacheKeyBelongsToHost(key, HOST)).toBe(true)
    })

    it('treats a platform-wide function entry as nobody\'s', () => {
      expect(cacheKeyBelongsToHost('nitro:functions:i18n:messages-internal:el-054c0cf1.json', HOST)).toBe(false)
    })
  })

  it('claims nothing outside the three Nitro families', () => {
    expect(cacheKeyBelongsToHost('sweep:f837316a', HOST)).toBe(false)
    expect(cacheKeyBelongsToHost('session:webside.gr:abc', HOST)).toBe(false)
  })
})
