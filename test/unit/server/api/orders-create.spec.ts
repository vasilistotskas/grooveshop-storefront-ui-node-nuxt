import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * POST /api/orders forwards the SHOPPER's identity to Django — the
 * User-Agent (order attribution's in-app-browser rule) and X-Real-IP /
 * proof of edge — alongside the cart headers, not the Nuxt pod's.
 */
const fetchMock = vi.fn()
const forwardMock = vi.fn((error: unknown) => ({ __forwarded: error }))
let validatedBody: unknown

const CART_HEADERS = {
  'X-Forwarded-Proto': 'https',
  'X-Forwarded-Host': 'shop.example',
  'X-Language': 'el',
  'X-Cart-Id': '7',
  'Authorization': 'Bearer token',
}
const IDENTITY_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone) Instagram 300.0',
  'X-Real-IP': '203.0.113.9',
  'X-Forwarded-For': '203.0.113.9, 10.0.0.1',
  'X-Origin-Verify': 'edge-secret',
}

vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('useRuntimeConfig', () => ({ apiBaseUrl: 'http://django/api/v1' }))
vi.stubGlobal('useCartSession', () => ({ getCartHeaders: async () => ({ ...CART_HEADERS }) }))
vi.stubGlobal('useLogger', () => ({ set: vi.fn() }))
vi.stubGlobal('readValidatedBody', async (_event: unknown, parse: (v: unknown) => unknown) => parse(validatedBody))
vi.stubGlobal('zCreateOrderBody', { parse: (v: unknown) => v })
vi.stubGlobal('zCreateOrderResponse', {})
vi.stubGlobal('getRequestHeader', () => undefined)
vi.stubGlobal('getRequestIP', () => undefined)
vi.stubGlobal('parseFbpFbcFromCookieHeader', () => ({}))
vi.stubGlobal('clientIdentityHeaders', () => ({ ...IDENTITY_HEADERS }))
vi.stubGlobal('$fetch', fetchMock)
vi.stubGlobal('parseDataAs', async (data: unknown) => data)
vi.stubGlobal('forwardUpstreamClientError', forwardMock)

type Handler = (event: unknown) => Promise<unknown>
const handler = (await import('../../../../server/api/orders/index.post')).default as Handler

beforeEach(() => {
  fetchMock.mockReset()
  forwardMock.mockClear()
  validatedBody = { payWayId: 1 }
})

describe('POST /api/orders', () => {
  it('sends the cart headers and the shopper identity headers to Django', async () => {
    fetchMock.mockResolvedValue({ id: 1 })

    await expect(handler({})).resolves.toEqual({ id: 1 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('http://django/api/v1/order')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ ...CART_HEADERS, ...IDENTITY_HEADERS })
  })
})
