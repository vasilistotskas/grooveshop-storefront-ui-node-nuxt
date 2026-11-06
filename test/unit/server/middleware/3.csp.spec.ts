/**
 * Regression guard: the browser-facing Content-Security-Policy must never
 * contain the INTERNAL SSR upstream (`config.djangoUrl`, e.g.
 * http://backend-service:80). The browser reaches Django only via same-origin
 * '/api/**' proxy routes and the wss:// notification socket, so the public API
 * origin (https://<djangoHostName>) is used in connect-src instead.
 *
 * Tenant dimension: pixel ids are TENANT-ONLY (no platform/env fallback —
 * every tenant provisions its own Pixel), and `TenantConfig.allowedCspSources`
 * expands script-src, img-src, connect-src and frame-src (scheme-filtered
 * by the builder). The directive builder itself (`shared/utils/csp.ts`)
 * runs for real; its own cases belong to its spec.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { getResponseHeader } from 'h3'
import type { H3Event } from 'h3'
import middleware from '~~/server/middleware/3.csp'
import { callHandler, createTestEvent, setRuntimeConfig } from '~~/test/helpers/nitro'
import { signInBuilderStaff } from '~~/test/helpers/builderStaff'

const INTERNAL_DJANGO_URL = 'http://backend-service:80'

interface RunOptions {
  tenant?: Record<string, unknown>
  requestHeaders?: Record<string, string>
}

interface RunResult {
  'event': H3Event
  'Content-Security-Policy': string
}

async function runWith(url: string, options: RunOptions = {}): Promise<RunResult> {
  const event = createTestEvent({
    url,
    headers: options.requestHeaders,
    context: options.tenant ? { tenant: options.tenant } : {},
  })
  await callHandler(middleware, event)
  return { 'event': event, 'Content-Security-Policy': getResponseHeader(event, 'Content-Security-Policy') as string }
}

const directive = (csp: string, name: string) =>
  csp.split(';').map(d => d.trim()).find(d => d.startsWith(`${name} `)) ?? ''

beforeEach(() => {
  setRuntimeConfig({
    djangoUrl: INTERNAL_DJANGO_URL,
    public: {
      mediaStreamOrigin: 'https://assets.webside.gr',
      static: { origin: 'https://static.webside.gr' },
      djangoHostName: 'api.webside.gr',
    },
  })
})

describe('who may frame a response', () => {
  const framing = (result: RunResult) => ({
    frameAncestors: directive(result['Content-Security-Policy'], 'frame-ancestors'),
    xFrameOptions: getResponseHeader(result.event, 'X-Frame-Options'),
  })
  const NOBODY = { frameAncestors: `frame-ancestors 'none'`, xFrameOptions: 'DENY' }
  const THE_STORE = { frameAncestors: `frame-ancestors 'self'`, xFrameOptions: 'SAMEORIGIN' }

  it('lets nobody frame a page', async () => {
    expect(framing(await runWith('/products'))).toEqual(NOBODY)
  })

  it('lets the store frame a page the editor previews, for a staff member', async () => {
    const cookie = await signInBuilderStaff()

    expect(framing(await runWith('/products?builder-canvas', { requestHeaders: { cookie } }))).toEqual(THE_STORE)
    expect(framing(await runWith('/en/?builder-canvas=1', { requestHeaders: { cookie } }))).toEqual(THE_STORE)
  })

  it('lets nobody frame the preview without a staff session', async () => {
    expect(framing(await runWith('/products?builder-canvas'))).toEqual(NOBODY)
  })

  it('lets nobody frame a page a staff member opens outside the editor', async () => {
    const cookie = await signInBuilderStaff()

    expect(framing(await runWith('/products', { requestHeaders: { cookie } }))).toEqual(NOBODY)
  })

  it('denies framing an API answer, which carries no CSP', async () => {
    const result = await runWith('/api/products')

    expect(result['Content-Security-Policy']).toBeUndefined()
    expect(getResponseHeader(result.event, 'X-Frame-Options')).toBe('DENY')
  })
})

describe('server/middleware/3.csp', () => {
  it('never leaks the internal SSR upstream into the CSP', async () => {
    const csp = (await runWith('/products/3/some-product'))['Content-Security-Policy']
    expect(csp).toContain('default-src \'self\'')
    expect(csp).not.toContain(INTERNAL_DJANGO_URL)
    expect(csp).not.toContain('backend-service')
  })

  it('uses the public API origin in connect-src and keeps wss for the socket', async () => {
    const csp = (await runWith('/products/3/some-product'))['Content-Security-Policy']
    const connectSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('connect-src')) ?? ''
    expect(connectSrc).toContain('https://api.webside.gr')
    expect(connectSrc).toContain('wss://api.webside.gr')
    expect(connectSrc).toContain('\'self\'')
  })

  it('puts the configured platform maps host in connect-src on every tenant\'s pages', async () => {
    const csp = (await runWith('/checkout', { tenant: { apiDomain: 'api.tenant.example' } }))['Content-Security-Policy']
    expect(directive(csp, 'connect-src').split(/\s+/)).toContain('https://maps.platform.test')
    expect(directive(csp, 'worker-src')).toBe(`worker-src 'self'`)
  })

  it('allows the asset origins for images but not the API host', async () => {
    const csp = (await runWith('/products/3/some-product'))['Content-Security-Policy']
    const imgSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('img-src')) ?? ''
    expect(imgSrc).toContain('https://assets.webside.gr')
    expect(imgSrc).toContain('https://static.webside.gr')
    // The API host is for XHR/WebSocket, not <img> — it should not be in img-src.
    expect(imgSrc).not.toContain('api.webside.gr')
  })

  it('allows the TikTok Pixel origins when the tenant provisions a pixel id', async () => {
    const csp = (await runWith('/products/3/some-product', {
      tenant: { tiktokPixelId: 'TENANT_TT_ID' },
    }))['Content-Security-Policy']
    const directive = (name: string) =>
      csp.split(';').map(d => d.trim()).find(d => d.startsWith(name)) ?? ''
    expect(directive('script-src')).toContain('https://analytics.tiktok.com')
    expect(directive('connect-src')).toContain('https://analytics.tiktok.com')
    expect(directive('connect-src')).toContain('https://*.tiktok.com')
    expect(directive('img-src')).toContain('https://*.tiktok.com')
  })

  it('does not gate on TikTok origins when the tenant has no pixel id (no platform/env fallback)', async () => {
    const csp = (await runWith('/products/3/some-product', {
      tenant: { tiktokPixelId: '' },
    }))['Content-Security-Policy']
    const directive = (name: string) =>
      csp.split(';').map(d => d.trim()).find(d => d.startsWith(name)) ?? ''
    expect(directive('script-src')).not.toContain('analytics.tiktok.com')
  })

  it('allows the Microsoft Clarity origins only for a store with a Clarity project', async () => {
    const withProject = await runWith('/products/3/some-product', { tenant: { clarityProjectId: 'z8z79wsqeu' } })
    const directiveOf = (name: string) => directive(withProject['Content-Security-Policy'], name)
    for (const name of ['script-src', 'img-src', 'connect-src']) {
      expect(directiveOf(name)).toContain('https://*.clarity.ms')
      expect(directiveOf(name)).toContain('https://c.bing.com')
    }

    const without = await runWith('/products/3/some-product', { tenant: { clarityProjectId: '' } })
    expect(without['Content-Security-Policy']).not.toContain('clarity.ms')
    expect(without['Content-Security-Policy']).not.toContain('c.bing.com')
  })

  it('does not gate on Meta/TikTok origins when there is no tenant at all', async () => {
    const csp = (await runWith('/products/3/some-product'))['Content-Security-Policy']
    const directive = (name: string) =>
      csp.split(';').map(d => d.trim()).find(d => d.startsWith(name)) ?? ''
    expect(directive('script-src')).not.toContain('analytics.tiktok.com')
    expect(directive('script-src')).not.toContain('connect.facebook.net')
  })

  it('appends filtered tenant allowedCspSources to the four browser directives', async () => {
    const csp = (await runWith('/products/3/some-product', {
      tenant: {
        allowedCspSources: [
          'https://cdn.tenant.example',
          'wss://live.tenant.example',
          'data:text/html,evil', // must be dropped by the scheme filter
          'http://insecure.example', // must be dropped too
        ],
      },
    }))['Content-Security-Policy']
    const directive = (name: string) =>
      csp.split(';').map(d => d.trim()).find(d => d.startsWith(name)) ?? ''
    for (const name of ['script-src', 'img-src', 'connect-src', 'frame-src']) {
      expect(directive(name)).toContain('https://cdn.tenant.example')
      expect(directive(name)).toContain('wss://live.tenant.example')
      expect(directive(name)).not.toContain('data:text/html,evil')
      expect(directive(name)).not.toContain('http://insecure.example')
    }
    // style-src is deliberately NOT expanded — tenant CSS sources would
    // widen the injection surface of the style pipeline for no feature.
    expect(directive('style-src')).not.toContain('cdn.tenant.example')
  })

  it('lists ONLY the tenant apiDomain origin (https + wss) in connect-src, never the platform host beside it', async () => {
    const csp = (await runWith('/products/3/some-product', {
      tenant: { apiDomain: 'api.tenant.example' },
    }))['Content-Security-Policy']
    const connectSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('connect-src')) ?? ''
    expect(connectSrc).toContain('https://api.tenant.example')
    expect(connectSrc).toContain('wss://api.tenant.example')
    // The platform host is another store's API when the platform tenant
    // is one of the stores — a tenant's pages must not be allowed to
    // open connections to it.
    expect(csp).not.toContain('api.webside.gr')
  })

  it('falls back to the platform host in connect-src only when the tenant has no apiDomain', async () => {
    const csp = (await runWith('/products/3/some-product', {
      tenant: { apiDomain: '' },
    }))['Content-Security-Policy']
    const connectSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('connect-src')) ?? ''
    expect(connectSrc).toContain('https://api.webside.gr')
    expect(connectSrc.match(/api\.webside\.gr/g)?.length).toBe(2) // https + wss, no duplicate
  })

  it('additively allows the tenant assetsDomain/staticDomain origins in img-src and connect-src alongside the platform origins', async () => {
    const csp = (await runWith('/products/3/some-product', {
      tenant: {
        assetsDomain: 'assets.tenant.example',
        staticDomain: 'static.tenant.example',
      },
    }))['Content-Security-Policy']
    const directive = (name: string) =>
      csp.split(';').map(d => d.trim()).find(d => d.startsWith(name)) ?? ''
    for (const name of ['img-src', 'connect-src']) {
      // Platform asset origins stay present.
      expect(directive(name)).toContain('https://assets.webside.gr')
      expect(directive(name)).toContain('https://static.webside.gr')
      // Tenant's own asset/static hosts are added, not swapped in.
      expect(directive(name)).toContain('https://assets.tenant.example')
      expect(directive(name)).toContain('https://static.tenant.example')
    }
  })

  it('omits the tenant assets/static origins when the tenant has none', async () => {
    const csp = (await runWith('/products/3/some-product', {
      tenant: { assetsDomain: '', staticDomain: '' },
    }))['Content-Security-Policy']
    const imgSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('img-src')) ?? ''
    expect(imgSrc).toContain('https://assets.webside.gr')
    expect(imgSrc).not.toContain('tenant.example')
  })

  it('skips API, _nuxt and _ipx routes (no CSP header set)', async () => {
    expect((await runWith('/api/products/3'))['Content-Security-Policy']).toBeUndefined()
    expect((await runWith('/_nuxt/entry.js'))['Content-Security-Policy']).toBeUndefined()
    expect((await runWith('/_ipx/_/image.png'))['Content-Security-Policy']).toBeUndefined()
  })

  it('emits a per-request nonce + strict-dynamic in script-src for SSR routes', async () => {
    // An UNCACHED route: /products and /blog are now SWR-cached families,
    // and a cached response cannot carry a per-request nonce.
    const result = await runWith('/search')
    const scriptSrc = result['Content-Security-Policy']!
      .split(';').map(d => d.trim()).find(d => d.startsWith('script-src')) ?? ''
    const nonce = result.event.context.cspNonce as string
    expect(nonce).toMatch(/^[A-Za-z0-9+/=]{20,}$/)
    expect(scriptSrc).toContain(`'nonce-${nonce}'`)
    expect(scriptSrc).toContain(`'strict-dynamic'`)
    // Legacy fallbacks stay for browsers without CSP3 support.
    expect(scriptSrc).toContain(`'unsafe-inline'`)
    expect(scriptSrc).toContain('https://js.stripe.com')
  })

  it('keeps the nonce-free policy on the SWR-cached homepage', async () => {
    // '/' is served from Nitro's cache (SWR_ROUTE_RULES): a per-request
    // nonce would be reused for the whole cache lifetime, so the cached
    // routes keep the 'unsafe-inline'-based policy instead.
    const result = await runWith('/')
    expect(result.event.context.cspNonce).toBeUndefined()
    expect(result['Content-Security-Policy']!).not.toContain('nonce-')
  })

  it('keeps the nonce-free policy across the SWR-cached route families', async () => {
    // Regression: these are glob route rules, so an exact-path Set lookup
    // missed every nested URL and handed them a nonce that the cached
    // HTML would then reuse for the whole TTL.
    for (const path of [
      '/blog',
      '/blog/categories',
      '/blog/category/5/PC',
      '/blog/post/42/mnhmh-ram-ti-einai',
      '/products',
      '/products/3/some-product',
      '/products/category/2/Powerbank',
    ]) {
      const result = await runWith(path)
      expect(result.event.context.cspNonce, path).toBeUndefined()
      expect(result['Content-Security-Policy']!, path).not.toContain('nonce-')
    }
  })

  it('still nonces sibling paths that merely share a prefix', async () => {
    // One segment deeper than a custom page, which is cached (`/blogging`).
    for (const path of ['/blogging/2026', '/productsxyz/1', '/cart']) {
      expect((await runWith(path)).event.context.cspNonce, path).toEqual(expect.any(String))
    }
  })

  it('serves a custom page, which Nitro caches, no nonce', async () => {
    for (const path of ['/kelari', '/en/kelari']) {
      expect((await runWith(path)).event.context.cspNonce, path).toBeUndefined()
    }
  })

  it('keeps the nonce-free unsafe-inline policy on prerendered routes', async () => {
    for (const path of ['/about', '/about/', '/about?utm_source=x']) {
      const result = await runWith(path)
      const csp = result['Content-Security-Policy']!
      expect(result.event.context.cspNonce).toBeUndefined()
      // The policy must not mention nonces at all, or browsers would
      // disable the 'unsafe-inline' the baked HTML depends on.
      expect(csp).not.toContain('nonce-')
      expect(csp).not.toContain('strict-dynamic')
      expect(csp).toContain(`'unsafe-inline'`)
    }
  })

  it('still issues a nonce when a client sends x-nitro-prerender', async () => {
    // The prerender exemption is gated on import.meta.prerender (a
    // build-time constant), not on this header — a visitor could
    // otherwise suppress the nonce on any route and be served the
    // weaker baked policy instead.
    // On an UNCACHED route, so the assertion isolates the header (a
    // cached route has its own, legitimate reason to omit the nonce).
    const result = await runWith('/search', {
      requestHeaders: { 'x-nitro-prerender': '/search' },
    })
    expect(result.event.context.cspNonce).toEqual(expect.any(String))
    expect(result['Content-Security-Policy']).toContain('nonce-')
  })

  describe('Google Ads conversion tracking', () => {
    // Linking an Ads account makes the SAME gtag.js the GA4 id loads
    // beacon to pagead2.googlesyndication.com/ccm/collect — as a fetch
    // first, then as an <img> fallback. Both were blocked in production,
    // so the store paid for ads whose conversions it could not measure.
    // Hosts are Google's documented set for these tags.
    const directive = (csp: string, name: string) =>
      csp.split(';').map(d => d.trim()).find(d => d.startsWith(name)) ?? ''

    it('allows the conversion beacon to be fetched', async () => {
      const csp = (await runWith('/'))['Content-Security-Policy']
      expect(directive(csp, 'connect-src'))
        .toContain('https://pagead2.googlesyndication.com')
    })

    it('allows the same beacon as an image fallback', async () => {
      const csp = (await runWith('/'))['Content-Security-Policy']
      expect(directive(csp, 'img-src'))
        .toContain('https://pagead2.googlesyndication.com')
    })

    it('allows the tags themselves to load', async () => {
      const csp = (await runWith('/'))['Content-Security-Policy']
      const scriptSrc = directive(csp, 'script-src')
      expect(scriptSrc).toContain('https://www.googleadservices.com')
      expect(scriptSrc).toContain('https://googleads.g.doubleclick.net')
    })

    it('keeps the doubleclick measurement endpoints reachable', async () => {
      const connectSrc = directive(
        (await runWith('/'))['Content-Security-Policy'],
        'connect-src',
      )
      expect(connectSrc).toContain('https://ad.doubleclick.net')
      expect(connectSrc).toContain('https://stats.g.doubleclick.net')
    })
  })

  it('allows the Meta Pixel origins only when the tenant provisions an id', async () => {
    const withPixel = (await runWith('/search', { tenant: { metaPixelId: '123' } }))['Content-Security-Policy']
    const without = (await runWith('/search', { tenant: { metaPixelId: '' } }))['Content-Security-Policy']

    expect(directive(withPixel, 'script-src')).toContain('https://connect.facebook.net')
    expect(directive(withPixel, 'frame-src')).toContain('https://www.facebook.com')
    expect(directive(without, 'script-src')).not.toContain('connect.facebook.net')
  })

  it('allows the ChatGPT Ads origin only when the tenant provisions an id', async () => {
    const withPixel = (await runWith('/search', { tenant: { openaiPixelId: 'oa-1' } }))['Content-Security-Policy']
    const without = (await runWith('/search', { tenant: {} }))['Content-Security-Policy']

    expect(directive(withPixel, 'script-src')).toContain('https://bzrcdn.openai.com')
    expect(directive(withPixel, 'connect-src')).toContain('https://bzrcdn.openai.com')
    expect(without).not.toContain('bzrcdn.openai.com')
  })

  it('widens the policy for Google sign-in only when the platform flag enables it', async () => {
    const disabled = (await runWith('/search'))['Content-Security-Policy']
    setRuntimeConfig({ public: { googleGsiEnable: true } })
    const enabled = (await runWith('/search'))['Content-Security-Policy']

    expect(directive(enabled, 'script-src')).toContain('https://accounts.google.com/gsi/client')
    expect(disabled).not.toContain('accounts.google.com/gsi/client')
  })

  it('falls back to the request Host, never X-Forwarded-Host, when no API host is configured', async () => {
    setRuntimeConfig({ public: { djangoHostName: '' } })

    const csp = (await runWith('/search', { requestHeaders: { 'x-forwarded-host': 'evil.example' } }))['Content-Security-Policy']

    expect(directive(csp, 'connect-src')).toContain('https://shop.test')
    expect(directive(csp, 'connect-src')).toContain('wss://shop.test')
    expect(csp).not.toContain('evil.example')
  })
})
