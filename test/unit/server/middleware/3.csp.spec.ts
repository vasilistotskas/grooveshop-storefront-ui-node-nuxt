/**
 * Unit tests for server/middleware/3.csp.ts
 *
 * Covers:
 * - Baseline CSP header is set on HTML routes.
 * - API / static asset routes are skipped.
 * - allowedCspSources from tenant config are appended to connect-src,
 *   img-src, script-src, and frame-src.
 * - Non-https / non-wss / non-localhost origins are filtered out.
 * - Empty allowedCspSources produces the same header as no tenant config.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Stubs required before the module under test is imported ----

const setResponseHeaderMock = vi.fn()
vi.stubGlobal('setResponseHeader', setResponseHeaderMock)

const getRequestHostMock = vi.fn().mockReturnValue('localhost')
vi.stubGlobal('getRequestHost', getRequestHostMock)

vi.stubGlobal('useRuntimeConfig', () => ({
  djangoUrl: 'http://django:8000',
  public: {
    mediaStreamOrigin: 'https://media.example.com',
    static: { origin: 'https://static.example.com' },
    djangoHostName: 'api.example.com',
    metaPixelId: '',
  },
}))

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)

// import.meta.dev is false in unit tests (node environment)
Object.defineProperty(import.meta, 'dev', { value: false, configurable: true })

// ---- Import module under test ----
const module = await import('../../../../server/middleware/3.csp')
const handler = (module.default ?? module) as unknown as (event: unknown) => void

// ---- Helpers ----
function makeEvent(path: string, tenant?: { allowedCspSources?: string[] }) {
  return { path, context: tenant !== undefined ? { tenant } : {} }
}

function capturedCsp(): string {
  const call = setResponseHeaderMock.mock.calls.at(-1)
  return call ? (call[2] as string) : ''
}

describe('3.csp middleware', () => {
  beforeEach(() => {
    setResponseHeaderMock.mockClear()
  })

  // --- Bypass paths ---
  it.each([
    '/api/products',
    '/api/health',
    '/_nuxt/chunk.abc.js',
    '/_ipx/w_200/logo.png',
  ])('skips CSP for %s', (path) => {
    handler(makeEvent(path))
    expect(setResponseHeaderMock).not.toHaveBeenCalled()
  })

  // --- Baseline header is set for HTML routes ---
  it('sets CSP header for an HTML page route', () => {
    handler(makeEvent('/products'))
    expect(setResponseHeaderMock).toHaveBeenCalledWith(
      expect.anything(),
      'Content-Security-Policy',
      expect.any(String),
    )
  })

  it('baseline CSP includes expected self directives', () => {
    handler(makeEvent('/'))
    const csp = capturedCsp()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  // --- No tenant / empty allowedCspSources → no extra origins ---
  it('produces the same header with no tenant context as with empty allowedCspSources', () => {
    handler(makeEvent('/a'))
    const withoutTenant = capturedCsp()
    setResponseHeaderMock.mockClear()

    handler(makeEvent('/b', { allowedCspSources: [] }))
    const withEmpty = capturedCsp()

    expect(withoutTenant).toBe(withEmpty)
  })

  // --- Tenant sources are appended to the four directives ---
  it('appends https tenant sources to script-src, img-src, connect-src, frame-src', () => {
    handler(makeEvent('/', {
      allowedCspSources: ['https://cdn.tenant.com', 'https://api.tenant.com'],
    }))
    const csp = capturedCsp()

    const get = (directive: string) =>
      csp.split('; ').find(d => d.startsWith(directive)) ?? ''

    expect(get('script-src')).toContain('https://cdn.tenant.com')
    expect(get('script-src')).toContain('https://api.tenant.com')
    expect(get('img-src')).toContain('https://cdn.tenant.com')
    expect(get('connect-src')).toContain('https://api.tenant.com')
    expect(get('frame-src')).toContain('https://cdn.tenant.com')
  })

  it('appends wss:// websocket tenant sources', () => {
    handler(makeEvent('/', { allowedCspSources: ['wss://ws.tenant.com'] }))
    const csp = capturedCsp()
    expect(csp).toContain('wss://ws.tenant.com')
  })

  it('allows http://localhost sources (dev helpers)', () => {
    handler(makeEvent('/', { allowedCspSources: ['http://localhost:3001'] }))
    const csp = capturedCsp()
    expect(csp).toContain('http://localhost:3001')
  })

  // --- Defense-in-depth: unsafe origins are filtered ---
  it('filters out http:// (non-localhost) origins', () => {
    handler(makeEvent('/', { allowedCspSources: ['http://insecure.example.com'] }))
    const csp = capturedCsp()
    expect(csp).not.toContain('http://insecure.example.com')
  })

  it('filters out data: URIs', () => {
    handler(makeEvent('/', { allowedCspSources: ['data:text/plain,hello'] }))
    const csp = capturedCsp()
    expect(csp).not.toContain('data:text/plain')
  })

  it('filters out blob: URIs', () => {
    handler(makeEvent('/', { allowedCspSources: ['blob:https://example.com/id'] }))
    const csp = capturedCsp()
    // The baseline img-src contains 'blob:' (allowed for object URLs).
    // Verify the injected blob: tenant source was rejected, not appended.
    expect(csp).not.toContain('blob:https://example.com/id')
  })

  it('keeps valid sources and filters invalid ones from a mixed list', () => {
    handler(makeEvent('/', {
      allowedCspSources: [
        'https://good.com',
        'http://bad.com',
        'wss://good-ws.com',
        'data:foo',
      ],
    }))
    const csp = capturedCsp()
    expect(csp).toContain('https://good.com')
    expect(csp).toContain('wss://good-ws.com')
    expect(csp).not.toContain('http://bad.com')
    expect(csp).not.toContain('data:foo')
  })

  // --- style-src is NOT extended by tenant sources ---
  it('does not add tenant sources to style-src', () => {
    handler(makeEvent('/', { allowedCspSources: ['https://tenant-style.com'] }))
    const csp = capturedCsp()
    const styleSrc = csp.split('; ').find(d => d.startsWith('style-src')) ?? ''
    expect(styleSrc).not.toContain('https://tenant-style.com')
  })
})
