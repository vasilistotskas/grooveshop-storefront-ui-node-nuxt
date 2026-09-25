/**
 * The post-deploy cache warm-up (scripts/warm-cache.mjs) must request
 * exactly the cache keys visitors hit: every device class the SSR cache
 * varies on, the payload URL Nuxt's client fetches, and only the hosts the
 * Ingresses route to the storefront.
 */
import { describe, expect, it } from 'vitest'
import { deviceClassFromUserAgent } from '../../../shared/utils/deviceClass'
import {
  DEVICE_USER_AGENTS,
  isCachedResponse,
  payloadPath,
  sitemapLocations,
  storefrontHosts,
  warmOrder,
} from '../../../scripts/warm-cache.mjs'

describe('DEVICE_USER_AGENTS', () => {
  it('holds one User-Agent per device class, classified into that class', () => {
    expect(Object.keys(DEVICE_USER_AGENTS).sort()).toEqual(['desktop', 'mobile', 'tablet'])
    for (const [deviceClass, userAgent] of Object.entries(DEVICE_USER_AGENTS)) {
      expect(deviceClassFromUserAgent(userAgent)).toBe(deviceClass)
    }
  })
})

describe('storefrontHosts', () => {
  const rule = (host: string | undefined, path: string, service: string) => ({
    host,
    http: { paths: [{ path, backend: { service: { name: service, port: { number: 80 } } } }] },
  })
  const ingresses = {
    items: [
      { spec: { rules: [rule('webside.gr', '/', 'frontend-nuxt-service'), rule('www.webside.gr', '/', 'frontend-nuxt-service')] } },
      { spec: { rules: [rule('webside.gr', '/mcp', 'agent-gateway-service')] } },
      { spec: { rules: [rule('webside.gr', '/api/contact/attachment', 'frontend-nuxt-service')] } },
      { spec: { rules: [rule('api.webside.gr', '/', 'backend-service')] } },
      { spec: { rules: [rule(undefined, '/', 'frontend-nuxt-service')] } },
      { spec: { rules: [rule('demo.grooveshop.space', '/', 'frontend-nuxt-service')] } },
    ],
  }

  it('keeps hosts whose / goes to the storefront, once each', () => {
    expect(storefrontHosts(ingresses, 'frontend-nuxt-service')).toEqual(['webside.gr', 'www.webside.gr', 'demo.grooveshop.space'])
  })

  it('skips path-routed services, other backends and the host-less catch-all', () => {
    expect(storefrontHosts(ingresses, 'backend-service')).toEqual(['api.webside.gr'])
  })
})

describe('sitemapLocations', () => {
  it('reads page URLs from a urlset, entities decoded', () => {
    const xml = '<?xml version="1.0"?><urlset><url><loc>https://webside.gr/</loc></url><url><loc> https://webside.gr/search?a=1&amp;b=2 </loc></url></urlset>'
    expect(sitemapLocations(xml)).toEqual({ sitemaps: [], pages: ['https://webside.gr/', 'https://webside.gr/search?a=1&b=2'] })
  })

  it('reads nested sitemaps from a sitemap index', () => {
    const xml = '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://webside.gr/__sitemap__/el-GR.xml</loc></sitemap></sitemapindex>'
    expect(sitemapLocations(xml)).toEqual({ sitemaps: ['https://webside.gr/__sitemap__/el-GR.xml'], pages: [] })
  })
})

describe('payloadPath', () => {
  it('matches the URL the client fetches (nuxt app/composables/payload.ts)', () => {
    expect(payloadPath('/', 'b1')).toBe('/_payload.json?_b=b1')
    expect(payloadPath('/blog/post/4/slug', 'b1')).toBe('/blog/post/4/slug/_payload.json?_b=b1')
    expect(payloadPath('/blog/', 'b1')).toBe('/blog/_payload.json?_b=b1')
  })
})

describe('isCachedResponse', () => {
  it('recognises the SWR route rules by s-maxage', () => {
    expect(isCachedResponse({ 'cache-control': 's-maxage=300, stale-while-revalidate' })).toBe(true)
    expect(isCachedResponse({ 'cache-control': 'no-cache' })).toBe(false)
    expect(isCachedResponse({ 'cache-control': 'public, max-age=60' })).toBe(false)
    expect(isCachedResponse({})).toBe(false)
  })
})

describe('warmOrder', () => {
  it('puts shallow pages first and keeps sitemap order within a depth', () => {
    const page = (pathname: string) => ({ host: 'webside.gr', pathname })
    expect(warmOrder([page('/blog/post/1/a'), page('/blog'), page('/'), page('/products'), page('/blog/category/1/x')]).map(p => p.pathname))
      .toEqual(['/', '/blog', '/products', '/blog/post/1/a', '/blog/category/1/x'])
  })
})
