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

const INTERNAL_DJANGO_URL = 'http://backend-service:80'

let handler: (event: { path: string }) => void
let headers: Record<string, string>

function runWith(path: string): Record<string, string> {
  headers = {}
  handler({ path })
  return headers
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
    },
  }))
  vi.stubGlobal('setResponseHeader', (_event: unknown, name: string, value: string) => {
    headers[name] = value
  })
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

  it('skips API, _nuxt and _ipx routes (no CSP header set)', () => {
    expect(runWith('/api/products/3')['Content-Security-Policy']).toBeUndefined()
    expect(runWith('/_nuxt/entry.js')['Content-Security-Policy']).toBeUndefined()
    expect(runWith('/_ipx/_/image.png')['Content-Security-Policy']).toBeUndefined()
  })
})
