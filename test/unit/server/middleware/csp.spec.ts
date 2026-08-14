/**
 * Unit tests for server/middleware/3.csp.ts
 *
 * Regression guard: the browser-facing Content-Security-Policy must never
 * contain the INTERNAL SSR upstream (`config.djangoUrl`, e.g.
 * http://backend-service:80). The browser reaches Django only via same-origin
 * '/api/**' proxy routes and the wss:// notification socket, so the public API
 * origin (https://<djangoHostName>) is used in connect-src instead.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateCspNonce } from '../../../../server/utils/csp'
import { PRERENDERED_ROUTES_SET } from '../../../../shared/constants/prerender'
import { buildCspDirectives } from '../../../../shared/utils/csp'

const INTERNAL_DJANGO_URL = 'http://backend-service:80'

interface TestEvent {
  path: string
  context: Record<string, unknown>
  headers?: Record<string, string>
}

let handler: (event: TestEvent) => void
let headers: Record<string, string>

function runWith(path: string, requestHeaders: Record<string, string> = {}): Record<string, string> & { event: TestEvent } {
  headers = {}
  const event: TestEvent = { path, context: {}, headers: requestHeaders }
  handler(event)
  return Object.assign({ event }, headers)
}

beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (fn: typeof handler) => fn)
  vi.stubGlobal('useRuntimeConfig', () => ({
    djangoUrl: INTERNAL_DJANGO_URL,
    public: {
      mediaStreamOrigin: 'https://assets.webside.gr',
      static: { origin: 'https://static.webside.gr' },
      djangoHostName: 'api.webside.gr',
      metaPixelId: 'PIXEL123',
      tiktokPixelId: 'TTPIXEL123',
    },
  }))
  vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) => {
    headers[name] = value
  })
  vi.stubGlobal('getRequestHeader', (event: TestEvent, name: string) => event.headers?.[name])
  // The middleware consumes these via server/shared auto-imports; unit tests
  // wire the REAL implementations so behavior (and the route list) can't drift.
  vi.stubGlobal('generateCspNonce', generateCspNonce)
  vi.stubGlobal('PRERENDERED_ROUTES_SET', PRERENDERED_ROUTES_SET)
  vi.stubGlobal('buildCspDirectives', buildCspDirectives)
  // Import after globals are stubbed — the module wraps its handler in
  // defineEventHandler at module-evaluation time.
  handler = (await import('../../../../server/middleware/3.csp')).default as typeof handler
})

afterAll(() => vi.unstubAllGlobals())

beforeEach(() => {
  headers = {}
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

  it('allows the TikTok Pixel origins when a pixel id is provisioned', () => {
    const csp = runWith('/products/3/some-product')['Content-Security-Policy']
    const directive = (name: string) =>
      csp.split(';').map(d => d.trim()).find(d => d.startsWith(name)) ?? ''
    expect(directive('script-src')).toContain('https://analytics.tiktok.com')
    expect(directive('connect-src')).toContain('https://analytics.tiktok.com')
    expect(directive('connect-src')).toContain('https://*.tiktok.com')
    expect(directive('img-src')).toContain('https://*.tiktok.com')
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
    const first = runWith('/').event.context.cspNonce
    const second = runWith('/').event.context.cspNonce
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first).not.toBe(second)
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

  it('skips the nonce during build-time prerender passes', () => {
    const result = runWith('/products/3/some-product', { 'x-nitro-prerender': '/products/3/some-product' })
    expect(result.event.context.cspNonce).toBeUndefined()
    expect(result['Content-Security-Policy']).not.toContain('nonce-')
  })
})
