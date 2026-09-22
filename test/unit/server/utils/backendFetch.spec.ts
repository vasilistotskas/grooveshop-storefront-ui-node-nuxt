import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Nuxt auto-imports and $fetch before importing the module under
// test. The module reads useRuntimeConfig() at singleton-init time, so
// stubs must be in place before the first useBackendFetch() call.
const runtimeConfig = {
  djangoUrl: 'http://backend-service:8000',
  apiBaseUrl: 'http://backend-service:8000/api/v1',
  public: {
    djangoHostName: 'api.webside.gr',
  },
}

let capturedInterceptor: ((ctx: { request: any, options: any }) => void) | null = null

const fetchCreate = vi.fn((opts: { onRequest: typeof capturedInterceptor }) => {
  capturedInterceptor = opts.onRequest
  return fetchCreate // returned handle is unused in these tests
})

const hostMock = vi.fn()
const eventMock = vi.fn()
const requestHeadersMock = vi.fn((): Record<string, string> => ({}))

vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)
vi.stubGlobal('$fetch', { create: fetchCreate })
vi.stubGlobal('getRequestHost', hostMock)
vi.stubGlobal('useEvent', eventMock)
vi.stubGlobal('getRequestHeaders', requestHeadersMock)
vi.stubGlobal('getRequestHeader', (_event: unknown, name: string) => requestHeadersMock()[name])
vi.stubGlobal('getRequestIP', () => undefined)

const { useBackendFetch } = await import('../../../../server/utils/backendFetch')

// Prime the module-level singleton ONCE so ``capturedInterceptor`` is set.
// ``useBackendFetch`` caches its $fetch instance, so subsequent calls
// will not re-run the interceptor registration.
useBackendFetch()

function runInterceptor(url: string) {
  const options = { headers: undefined as any }
  capturedInterceptor!({ request: url, options })
  const headers = options.headers as Headers
  return {
    proto: headers.get('X-Forwarded-Proto'),
    host: headers.get('X-Forwarded-Host'),
    language: headers.get('X-Language'),
    realIp: headers.get('X-Real-IP'),
    originVerify: headers.get('X-Origin-Verify'),
    userAgent: headers.get('User-Agent'),
  }
}

describe('useBackendFetch', () => {
  beforeEach(() => {
    hostMock.mockReset()
    eventMock.mockReset()
    requestHeadersMock.mockReset()
    requestHeadersMock.mockReturnValue({})
  })

  it('forwards the visitor IP and the proof of edge, like createHeaders()', () => {
    // Without these Django's `trusted_client_ip` returned None and every
    // anonymous throttle on the contact, feedback and gift-card routes
    // keyed on the Nuxt pod — one budget for the whole store.
    eventMock.mockReturnValue({ context: { locale: 'el' } })
    hostMock.mockReturnValue('demo.grooveshop.space')
    requestHeadersMock.mockReturnValue({
      'cf-connecting-ip': '203.0.113.42',
      'x-origin-verify': 'edge-secret',
      'user-agent': 'Mozilla/5.0',
    })

    const { realIp, originVerify, userAgent } = runInterceptor('http://backend-service:8000/api/v1/contact')

    expect(realIp).toBe('203.0.113.42')
    expect(originVerify).toBe('edge-secret')
    expect(userAgent).toBe('Mozilla/5.0')
  })

  it('sends no identity headers outside a request', () => {
    eventMock.mockImplementation(() => {
      throw new Error('no request context')
    })

    const { realIp, originVerify } = runInterceptor('http://backend-service:8000/api/v1/product')

    expect(realIp).toBeNull()
    expect(originVerify).toBeNull()
  })

  it('forwards the actual request host as X-Forwarded-Host', () => {
    eventMock.mockReturnValueOnce({ context: { locale: 'el' } })
    hostMock.mockReturnValueOnce('tenant-b.com')

    const { host } = runInterceptor('http://backend-service:8000/api/v1/product')

    // This is the whole point of the multi-tenant fix: each request
    // carries its own tenant host, not the build-time djangoHostName.
    expect(host).toBe('tenant-b.com')
  })

  it('falls back to djangoHostName when there is no active request', () => {
    eventMock.mockImplementationOnce(() => {
      throw new Error('no request context')
    })

    const { host } = runInterceptor('http://backend-service:8000/api/v1/product')

    expect(host).toBe('api.webside.gr')
  })

  it('always sets X-Forwarded-Proto: https on internal origins', () => {
    eventMock.mockReturnValueOnce({ context: { locale: 'el' } })
    hostMock.mockReturnValueOnce('webside.gr')

    const { proto } = runInterceptor('http://backend-service:8000/api/v1/product')

    expect(proto).toBe('https')
  })

  it('forwards event locale as X-Language', () => {
    eventMock.mockReturnValueOnce({ context: { locale: 'de' } })
    hostMock.mockReturnValueOnce('webside.gr')

    const { language } = runInterceptor('http://backend-service:8000/api/v1/product')

    expect(language).toBe('de')
  })

  it('skips header injection for non-internal URLs', () => {
    // An external URL (Stripe, Cloudflare, etc.) is out of scope for
    // the tenant-forwarding headers — the interceptor returns early.
    eventMock.mockReturnValueOnce({ context: { locale: 'el' } })
    hostMock.mockReturnValueOnce('webside.gr')

    const options: { headers: any } = { headers: undefined }
    capturedInterceptor!({ request: 'https://api.stripe.com/v1/charges', options })

    expect(options.headers).toBeUndefined()
  })
})
