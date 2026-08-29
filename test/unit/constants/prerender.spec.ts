import { describe, it, expect } from 'vitest'
import {
  CACHED_SSR_ROUTES_SET,
  SWR_ROUTE_PATTERN_RULES,
  isCachedSsrRoute,
} from '../../../shared/constants/prerender'

describe('isCachedSsrRoute', () => {
  it('matches the exact cached routes', () => {
    for (const path of ['/', '/about', '/contact', '/blog', '/products']) {
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
    ]) {
      expect(isCachedSsrRoute(path), path).toBe(true)
    }
  })

  it('does not bleed into sibling paths that share a prefix', () => {
    for (const path of [
      '/blogging',
      '/productsxyz',
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
    for (const pattern of Object.keys(SWR_ROUTE_PATTERN_RULES)) {
      if (!pattern.endsWith('/**')) continue
      const bare = pattern.slice(0, -'/**'.length)
      expect(SWR_ROUTE_PATTERN_RULES, bare).toHaveProperty(bare)
      expect(CACHED_SSR_ROUTES_SET.has(bare), bare).toBe(true)
    }
  })
})
