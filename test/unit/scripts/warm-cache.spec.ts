/**
 * The post-deploy cache warm-up (scripts/warm-cache.mjs) must request
 * exactly the cache keys visitors hit: every device class the SSR cache
 * varies on, the payload URL Nuxt's client fetches, and only the hosts the
 * Ingresses route to the storefront.
 */
import { describe, expect, it } from 'vitest'
import { deviceClassFromUserAgent } from '~~/shared/utils/deviceClass'
import {
  DEVICE_USER_AGENTS,
  isCachedResponse,
  localeOf,
  localePrefixes,
  localeTwin,
  payloadPath,
  recordWarmedBuild,
  sitemapLocations,
  storefrontHosts,
  warmedBuild,
  warmedEveryStore,
  warmOrder,
} from '~~/scripts/warm-cache.mjs'

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
  it('recognises a cached page by the edge directive the storefront adds to it', () => {
    expect(isCachedResponse({ 'cache-control': 'no-cache', 'cloudflare-cdn-cache-control': 'max-age=60, stale-while-revalidate=86400' })).toBe(true)
    expect(isCachedResponse({ 'cache-control': 'no-cache' })).toBe(false)
    expect(isCachedResponse({ 'cache-control': 's-maxage=300, stale-while-revalidate' })).toBe(false)
    expect(isCachedResponse({})).toBe(false)
  })
})

describe('warmOrder', () => {
  it('puts shallow pages first and keeps sitemap order within a depth', () => {
    const page = (pathname: string) => ({ host: 'webside.gr', pathname })
    expect(warmOrder([page('/blog/post/1/a'), page('/blog'), page('/'), page('/products'), page('/blog/category/1/x')]).map((p: { pathname: string }) => p.pathname))
      .toEqual(['/', '/blog', '/products', '/blog/post/1/a', '/blog/category/1/x'])
  })

  it('ranks a page in another locale with its default-locale twin', () => {
    const page = (pathname: string, locale = '') => ({ host: 'demo.grooveshop.space', pathname, locale })
    expect(warmOrder([page('/products/1/a'), page('/en/products/1/a', '/en'), page('/en/products', '/en'), page('/en', '/en')]).map((p: { pathname: string }) => p.pathname))
      .toEqual(['/en', '/en/products', '/products/1/a', '/en/products/1/a'])
  })
})

describe('localePrefixes', () => {
  // The shape @nuxtjs/sitemap serves (demo.grooveshop.space, 2026-10-21).
  const entry = (loc: string, alternates: string[] = []) =>
    `<url><loc>${loc}</loc>${alternates.map(href => `<xhtml:link rel="alternate" hreflang="x" href="${href}" />`).join('')}</url>`

  it('reads the other locales a store serves from its home page alternates', () => {
    const xml = `<urlset>${entry('https://demo.grooveshop.space/about', ['https://demo.grooveshop.space/en/about'])}${entry('https://demo.grooveshop.space/', ['https://demo.grooveshop.space/', 'https://demo.grooveshop.space/en', 'https://demo.grooveshop.space/'])}</urlset>`
    expect(localePrefixes(xml)).toEqual(['/en'])
  })

  it('finds none for a store that serves one locale', () => {
    const xml = `<urlset>${entry('https://webside.gr/')}${entry('https://webside.gr/about')}</urlset>`
    expect(localePrefixes(xml)).toEqual([])
  })
})

describe('warmedEveryStore', () => {
  const rendered = (counts: Record<string, number>) => new Map(Object.entries(counts))

  it('does not record a run whose sitemaps all failed (Django restarting after the deploy)', () => {
    expect(warmedEveryStore({
      failedSitemaps: ['webside.gr/sitemap.xml', 'demo.grooveshop.space/sitemap.xml'],
      stores: [],
      rendered: rendered({}),
    })).toBe(false)
  })

  it('does not record a run in which no page rendered', () => {
    expect(warmedEveryStore({
      failedSitemaps: [],
      stores: ['webside.gr', 'demo.grooveshop.space'],
      rendered: rendered({}),
    })).toBe(false)
  })

  it('records a run that rendered every store, a few stale URLs failing among them', () => {
    // 282 pages listed, three of them no longer render: counted, not a reason.
    expect(warmedEveryStore({
      failedSitemaps: [],
      stores: ['webside.gr', 'demo.grooveshop.space'],
      rendered: rendered({ 'webside.gr': 106, 'demo.grooveshop.space': 120 }),
    })).toBe(true)
  })

  it('does not record a run in which one store\'s sitemap failed, the others warm', () => {
    expect(warmedEveryStore({
      failedSitemaps: ['ekfyseosfyteias.com/sitemap.xml'],
      stores: ['webside.gr', 'demo.grooveshop.space'],
      rendered: rendered({ 'webside.gr': 106, 'demo.grooveshop.space': 120 }),
    })).toBe(false)
  })

  it('does not record a run in which one store rendered nothing', () => {
    expect(warmedEveryStore({
      failedSitemaps: [],
      stores: ['webside.gr', 'demo.grooveshop.space'],
      rendered: rendered({ 'webside.gr': 106 }),
    })).toBe(false)
  })
})

describe('the build last warmed', () => {
  type Call = { path: string, method: string, contentType?: string, body?: unknown }
  // The Kubernetes API as `kubernetes()` exposes it, answering from a
  // script and recording what it was asked.
  function fakeKube(...answers: Array<{ status: number, body?: unknown }>) {
    const calls: Call[] = []
    return {
      calls,
      kube: {
        namespace: 'grooveshop',
        call: async (path: string, { method = 'GET', contentType, body }: Omit<Call, 'path'> = { method: 'GET' }) => {
          calls.push({ path, method, contentType, body })
          const answer = answers.shift() ?? { status: 500 }
          return { status: answer.status, headers: {}, body: JSON.stringify(answer.body ?? {}), ms: 0 }
        },
      },
    }
  }

  it('reads the build from the ConfigMap, and none before the first run', async () => {
    const recorded = fakeKube({ status: 200, body: { data: { warmedBuild: 'b1' } } })
    expect(await warmedBuild(recorded.kube, 'storefront-warm-state')).toBe('b1')
    expect(recorded.calls[0]?.path).toBe('/api/v1/namespaces/{namespace}/configmaps/storefront-warm-state')

    expect(await warmedBuild(fakeKube({ status: 404 }).kube, 'storefront-warm-state')).toBeUndefined()
  })

  it('refuses to guess when the ConfigMap cannot be read', async () => {
    await expect(warmedBuild(fakeKube({ status: 403 }).kube, 'storefront-warm-state')).rejects.toThrow('403')
  })

  it('records the build in the ConfigMap, creating it on the first run', async () => {
    const existing = fakeKube({ status: 200 })
    await recordWarmedBuild(existing.kube, 'storefront-warm-state', 'b2')
    expect(existing.calls).toEqual([{
      path: '/api/v1/namespaces/{namespace}/configmaps/storefront-warm-state',
      method: 'PATCH',
      contentType: 'application/merge-patch+json',
      body: { data: { warmedBuild: 'b2' } },
    }])

    const absent = fakeKube({ status: 404 }, { status: 201 })
    await recordWarmedBuild(absent.kube, 'storefront-warm-state', 'b2')
    expect(absent.calls[1]).toEqual({
      path: '/api/v1/namespaces/{namespace}/configmaps',
      method: 'POST',
      contentType: 'application/json',
      body: { apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: 'storefront-warm-state' }, data: { warmedBuild: 'b2' } },
    })
  })
})

describe('localeOf and localeTwin', () => {
  it('names the locale prefix a page is under, and none for the default locale', () => {
    expect(localeOf('/en', ['/en'])).toBe('/en')
    expect(localeOf('/en/products/1/a', ['/en'])).toBe('/en')
    expect(localeOf('/products/1/a', ['/en'])).toBe('')
    // A first segment that merely starts with the prefix is not under it.
    expect(localeOf('/energy', ['/en'])).toBe('')
  })

  it('places a default-locale page under a prefix, the home page as the bare prefix', () => {
    expect(localeTwin('/', '/en')).toBe('/en')
    expect(localeTwin('/products/1/a', '/en')).toBe('/en/products/1/a')
  })
})
