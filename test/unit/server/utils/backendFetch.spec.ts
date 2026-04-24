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

vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)
vi.stubGlobal('$fetch', { create: fetchCreate })
vi.stubGlobal('getRequestHost', hostMock)
vi.stubGlobal('useEvent', eventMock)

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
  }
}

describe('useBackendFetch', () => {
  beforeEach(() => {
    hostMock.mockReset()
    eventMock.mockReset()
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
