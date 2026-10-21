import { describe, it, expect } from 'vitest'
import {
  CACHED_SSR_ROUTES_SET,
  CUSTOM_PAGE_ROUTES,
  SWR_ROUTE_PATTERN_RULES,
  isCachedSsrRoute,
  withLocalePrefixes,
} from '~~/shared/constants/prerender'

describe('isCachedSsrRoute', () => {
  it('matches the exact cached routes', () => {
    for (const path of ['/', '/about', '/contact', '/blog', '/products', '/offers', '/loyalty-program']) {
      expect(isCachedSsrRoute(path), path).toBe(true)
    }
  })

  it('matches every page under a cached route family', () => {
    // Regression: the prefixes are derived by stripping `/**`. An
    // off-by-one there left a trailing slash, so the `${prefix}/` test
    // compared against a doubled slash and no nested page ever matched —
    // every blog post and product page would have been served a
    // per-request CSP nonce baked into HTML replayed for the whole TTL.
    for (const path of [
      '/blog/categories',
      '/blog/category/5/PC',
      '/blog/post/42/mnhmh-ram-ti-einai',
      '/products/3/some-product',
      '/products/category/2/Powerbank',
      '/info/faq',
      '/info/shipping-info',
    ]) {
      expect(isCachedSsrRoute(path), path).toBe(true)
    }
  })

  it('does not bleed into sibling paths that share a prefix', () => {
    // One segment deeper than a custom page (`/blogging` is one).
    for (const path of [
      '/blogging/2026',
      '/productsxyz/1',
      '/cart',
      '/checkout',
      '/search',
      '/account/orders',
    ]) {
      expect(isCachedSsrRoute(path), path).toBe(false)
    }
  })

  it('normalises trailing slashes', () => {
    expect(isCachedSsrRoute('/blog/')).toBe(true)
    expect(isCachedSsrRoute('/')).toBe(true)
    expect(isCachedSsrRoute('/cart/')).toBe(false)
  })

  it('keeps the bare path alongside each glob', () => {
    // A Nitro glob does not match its own prefix, so `/blog/**` alone
    // would leave `/blog` uncached while every child was cached.
    // `/info` has no index page — only `/info/<slug>` — and a rule for it
    // would put a 404 into the sitemap, which lists route-rule paths.
    const familiesWithoutIndex = new Set(['/info/**'])
    for (const pattern of Object.keys(SWR_ROUTE_PATTERN_RULES)) {
      if (!pattern.endsWith('/**') || familiesWithoutIndex.has(pattern)) continue
      const bare = pattern.slice(0, -'/**'.length)
      expect(SWR_ROUTE_PATTERN_RULES, bare).toHaveProperty(bare)
      expect(CACHED_SSR_ROUTES_SET.has(bare), bare).toBe(true)
    }
  })
})

describe('custom pages', () => {
  it('caches a merchant page at /<slug>, in every locale', () => {
    for (const path of ['/kelari', '/poies-eimaste', '/chrimatodotisi/', '/en/kelari']) {
      expect(isCachedSsrRoute(path), path).toBe(true)
    }
  })

  it('keeps every one-segment page that is not a custom page uncached', () => {
    // The custom-page handler answers `/*`, so these reach it too; each
    // is refused by `isCustomPageSlug` (a static route, a locale, a slug
    // the catch-all rejects), and so bypasses the cache.
    for (const path of ['/cart', '/checkout', '/search', '/account', '/feedback', '/gift-cards', '/newsletter', '/en/cart', '/el', '/Our-Story', '/rss.xml']) {
      expect(isCachedSsrRoute(path), path).toBe(false)
    }
  })

  it('is not a two-segment path under the default locale prefix', () => {
    expect(isCachedSsrRoute('/el/kelari')).toBe(false)
  })

  it('answers on the one-segment route of every locale', () => {
    expect(CUSTOM_PAGE_ROUTES).toEqual(['/*', '/en/*'])
  })
})

describe('cached routes in a prefixed locale', () => {
  it('treats an English page as the same cached route as its Greek one', () => {
    for (const path of ['/en', '/en/', '/en/about', '/en/blog', '/en/blog/post/42/x', '/en/products', '/en/products/3/some-product']) {
      expect(isCachedSsrRoute(path), path).toBe(true)
    }
  })

  it('does not cache an English page the Greek site does not cache either', () => {
    for (const path of ['/en/cart', '/en/checkout', '/en/account/orders', '/en/search']) {
      expect(isCachedSsrRoute(path), path).toBe(false)
    }
  })

  it('adds no rule for a family without an index page', () => {
    expect(SWR_ROUTE_PATTERN_RULES).not.toHaveProperty('/info')
    expect(SWR_ROUTE_PATTERN_RULES).toHaveProperty('/info/**')
  })

  it('does not strip the default locale, which prefix_except_default never emits', () => {
    expect(isCachedSsrRoute('/el/products')).toBe(false)
    expect(isCachedSsrRoute('/el')).toBe(false)
  })

  it('expands a route into its URL in every locale, the home page without a trailing path', () => {
    expect(withLocalePrefixes('/')).toEqual(['/', '/en'])
    expect(withLocalePrefixes('/about')).toEqual(['/about', '/en/about'])
    expect(withLocalePrefixes('/blog/**')).toEqual(['/blog/**', '/en/blog/**'])
  })
})
