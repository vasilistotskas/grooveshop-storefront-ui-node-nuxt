/**
 * Unit tests for server/middleware/3.csp.ts
 *
 * Regression guard: the browser-facing Content-Security-Policy must never
 * contain the INTERNAL SSR upstream (`config.djangoUrl`, e.g.
 * http://backend-service:80). The browser reaches Django only via same-origin
 * '/api/**' proxy routes and the wss:// notification socket, so the public API
 * origin (https://<djangoHostName>) is used in connect-src instead.
 *
 * Tenant dimension: pixel ids are TENANT-ONLY (no platform/env fallback —
 * every tenant provisions its own Pixel), and `TenantConfig.allowedCspSources`
 * expands script-src, img-src, connect-src and frame-src (scheme-filtered
 * by the builder).
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateCspNonce } from '../../../../server/utils/csp'
import { CACHED_SSR_ROUTES_SET, PRERENDERED_ROUTES_SET } from '../../../../shared/constants/prerender'
import { buildCspDirectives } from '../../../../shared/utils/csp'

const INTERNAL_DJANGO_URL = 'http://backend-service:80'

const BASE_PUBLIC_CONFIG = {
  mediaStreamOrigin: 'https://assets.webside.gr',
  static: { origin: 'https://static.webside.gr' },
  djangoHostName: 'api.webside.gr',
}

interface TestEvent {
  path: string
  context: Record<string, unknown>
  headers?: Record<string, string>
}

let publicConfig: Record<string, unknown>
let handler: (event: TestEvent) => void
let headers: Record<string, string>

interface RunOptions {
  tenant?: Record<string, unknown>
  requestHeaders?: Record<string, string>
}

function runWith(path: string, options: RunOptions = {}): Record<string, string> & { event: TestEvent } {
  headers = {}
  const event: TestEvent = {
    path,
    context: options.tenant ? { tenant: options.tenant } : {},
    headers: options.requestHeaders ?? {},
  }
  handler(event)
  return Object.assign({ event }, headers)
}

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (fn: typeof handler) => fn)
  vi.stubGlobal('useRuntimeConfig', () => ({
    djangoUrl: INTERNAL_DJANGO_URL,
    public: publicConfig,
  }))
  vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) => {
    headers[name] = value
  })
  vi.stubGlobal('getRequestHeader', (event: TestEvent, name: string) => event.headers?.[name])
  vi.stubGlobal('getRequestHost', (event: TestEvent) => event.headers?.host ?? '')
  // The middleware consumes these via server/shared auto-imports; unit tests
  // wire the REAL implementations so behavior (and the route list) can't drift.
  vi.stubGlobal('generateCspNonce', generateCspNonce)
  vi.stubGlobal('PRERENDERED_ROUTES_SET', PRERENDERED_ROUTES_SET)
  vi.stubGlobal('CACHED_SSR_ROUTES_SET', CACHED_SSR_ROUTES_SET)
  vi.stubGlobal('buildCspDirectives', buildCspDirectives)
  // Import after globals are stubbed — the module wraps its handler in
  // defineEventHandler at module-evaluation time.
  handler = (await import('../../../../server/middleware/3.csp')).default as typeof handler
})

afterAll(() => vi.unstubAllGlobals())

beforeEach(() => {
  headers = {}
  publicConfig = { ...BASE_PUBLIC_CONFIG }
})

describe('csp middleware', () => {
  it('never leaks the internal SSR upstream into the CSP', () => {
    const csp = runWith('/products/3/some-product')['Content-Security-Policy']
    expect(csp).toBeDefined()
    expect(csp).not.toContain(INTERNAL_DJANGO_URL)
    expect(csp).not.toContain('backend-service')
  })

  it('uses the public API origin in connect-src and keeps wss for the socket', () => {
    const csp = runWith('/products/3/some-product')['Content-Security-Policy']
    const connectSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('connect-src')) ?? ''
    expect(connectSrc).toContain('https://api.webside.gr')
    expect(connectSrc).toContain('wss://api.webside.gr')
    expect(connectSrc).toContain('\'self\'')
  })

  it('allows the asset origins for images but not the API host', () => {
    const csp = runWith('/products/3/some-product')['Content-Security-Policy']
    const imgSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('img-src')) ?? ''
    expect(imgSrc).toContain('https://assets.webside.gr')
    expect(imgSrc).toContain('https://static.webside.gr')
    // The API host is for XHR/WebSocket, not <img> — it should not be in img-src.
    expect(imgSrc).not.toContain('api.webside.gr')
  })

  it('allows the TikTok Pixel origins when the tenant provisions a pixel id', () => {
    const csp = runWith('/products/3/some-product', {
      tenant: { tiktokPixelId: 'TENANT_TT_ID' },
    })['Content-Security-Policy']
    const directive = (name: string) =>
      csp.split(';').map(d => d.trim()).find(d => d.startsWith(name)) ?? ''
    expect(directive('script-src')).toContain('https://analytics.tiktok.com')
    expect(directive('connect-src')).toContain('https://analytics.tiktok.com')
    expect(directive('connect-src')).toContain('https://*.tiktok.com')
    expect(directive('img-src')).toContain('https://*.tiktok.com')
  })

  it('does not gate on TikTok origins when the tenant has no pixel id (no platform/env fallback)', () => {
    const csp = runWith('/products/3/some-product', {
      tenant: { tiktokPixelId: '' },
    })['Content-Security-Policy']
    const directive = (name: string) =>
      csp.split(';').map(d => d.trim()).find(d => d.startsWith(name)) ?? ''
    expect(directive('script-src')).not.toContain('analytics.tiktok.com')
  })

  it('does not gate on Meta/TikTok origins when there is no tenant at all', () => {
    const csp = runWith('/products/3/some-product')['Content-Security-Policy']
    const directive = (name: string) =>
      csp.split(';').map(d => d.trim()).find(d => d.startsWith(name)) ?? ''
    expect(directive('script-src')).not.toContain('analytics.tiktok.com')
    expect(directive('script-src')).not.toContain('connect.facebook.net')
  })

  it('appends filtered tenant allowedCspSources to the four browser directives', () => {
    const csp = runWith('/products/3/some-product', {
      tenant: {
        allowedCspSources: [
          'https://cdn.tenant.example',
          'wss://live.tenant.example',
          'data:text/html,evil', // must be dropped by the scheme filter
          'http://insecure.example', // must be dropped too
        ],
      },
    })['Content-Security-Policy']
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

  it('additively allows the tenant apiDomain origin (https + wss) in connect-src alongside the platform host', () => {
    const csp = runWith('/products/3/some-product', {
      tenant: { apiDomain: 'api.tenant.example' },
    })['Content-Security-Policy']
    const connectSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('connect-src')) ?? ''
    // Platform host stays present (SSR assets / dev-time fallback).
    expect(connectSrc).toContain('https://api.webside.gr')
    expect(connectSrc).toContain('wss://api.webside.gr')
    // Tenant's own API host is added, not swapped in.
    expect(connectSrc).toContain('https://api.tenant.example')
    expect(connectSrc).toContain('wss://api.tenant.example')
  })

  it('omits the tenant apiDomain from connect-src when the tenant has none (e.g. the platform tenant)', () => {
    const csp = runWith('/products/3/some-product', {
      tenant: { apiDomain: '' },
    })['Content-Security-Policy']
    const connectSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('connect-src')) ?? ''
    expect(connectSrc).toContain('https://api.webside.gr')
    expect(connectSrc.match(/api\.webside\.gr/g)?.length).toBe(2) // https + wss, no duplicate
  })

  it('additively allows the tenant assetsDomain/staticDomain origins in img-src and connect-src alongside the platform origins', () => {
    const csp = runWith('/products/3/some-product', {
      tenant: {
        assetsDomain: 'assets.tenant.example',
        staticDomain: 'static.tenant.example',
      },
    })['Content-Security-Policy']
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

  it('omits the tenant assets/static origins when the tenant has none', () => {
    const csp = runWith('/products/3/some-product', {
      tenant: { assetsDomain: '', staticDomain: '' },
    })['Content-Security-Policy']
    const imgSrc = csp.split(';').map(d => d.trim()).find(d => d.startsWith('img-src')) ?? ''
    expect(imgSrc).toContain('https://assets.webside.gr')
    expect(imgSrc).not.toContain('tenant.example')
  })

  it('skips API, _nuxt and _ipx routes (no CSP header set)', () => {
    expect(runWith('/api/products/3')['Content-Security-Policy']).toBeUndefined()
    expect(runWith('/_nuxt/entry.js')['Content-Security-Policy']).toBeUndefined()
    expect(runWith('/_ipx/_/image.png')['Content-Security-Policy']).toBeUndefined()
  })

  it('emits a per-request nonce + strict-dynamic in script-src for SSR routes', () => {
    const result = runWith('/products/3/some-product')
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

  it('generates a fresh nonce per request', () => {
    const first = runWith('/products').event.context.cspNonce
    const second = runWith('/products').event.context.cspNonce
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first).not.toBe(second)
  })

  it('keeps the nonce-free policy on the SWR-cached homepage', () => {
    // '/' is served from Nitro's cache (SWR_ROUTE_RULES): a per-request
    // nonce would be reused for the whole cache lifetime, so the cached
    // routes keep the 'unsafe-inline'-based policy instead.
    const result = runWith('/')
    expect(result.event.context.cspNonce).toBeUndefined()
    expect(result['Content-Security-Policy']!).not.toContain('nonce-')
  })

  it('keeps the nonce-free unsafe-inline policy on prerendered routes', () => {
    for (const path of ['/about', '/about/', '/about?utm_source=x']) {
      const result = runWith(path)
      const csp = result['Content-Security-Policy']!
      expect(result.event.context.cspNonce).toBeUndefined()
      // The policy must not mention nonces at all, or browsers would
      // disable the 'unsafe-inline' the baked HTML depends on.
      expect(csp).not.toContain('nonce-')
      expect(csp).not.toContain('strict-dynamic')
      expect(csp).toContain(`'unsafe-inline'`)
    }
  })

  it('still issues a nonce when a client sends x-nitro-prerender', () => {
    // The prerender exemption is gated on import.meta.prerender (a
    // build-time constant), not on this header — a visitor could
    // otherwise suppress the nonce on any route and be served the
    // weaker baked policy instead.
    const result = runWith('/products/3/some-product', {
      requestHeaders: { 'x-nitro-prerender': '/products/3/some-product' },
    })
    expect(result.event.context.cspNonce).toBeDefined()
    expect(result['Content-Security-Policy']).toContain('nonce-')
  })
})
