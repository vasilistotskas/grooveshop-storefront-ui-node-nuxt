import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import * as z from 'zod'
import { useCartSession as realUseCartSession } from '../../../../../server/utils/cartSession'
import { parseDataAs as realParseDataAs } from '../../../../../server/utils/parser'

// The route is wrapped in `defineEventHandler`, which must resolve to a
// real (identity) function before the module is evaluated — dynamic
// import() lets us stub it first, since a static top-level import would
// run before any stubGlobal() call in this file (ESM import hoisting).
let claimHandler: (event: any) => Promise<unknown>

const VALID_CART_UUID = '11111111-1111-4111-8111-111111111111'
const UNKNOWN_CART_UUID = '99999999-9999-4999-8999-999999999999'

// Mirrors the shape cartSession.ts needs from an H3Event (see
// cartSession.spec.ts) plus a `_query` bag the stubbed getValidatedQuery
// reads from.
const createMockEvent = (query: Record<string, unknown> = {}) => {
  const resHeaders: Record<string, string | string[]> = {}
  return {
    context: {},
    node: {
      req: { headers: {} as Record<string, string | string[] | undefined> },
      res: {
        getHeader: (name: string) => resHeaders[name.toLowerCase()],
        setHeader: (name: string, value: string | string[]) => {
          resHeaders[name.toLowerCase()] = value
        },
        removeHeader: (name: string) => {
          delete resHeaders[name.toLowerCase()]
        },
        headersSent: false,
      },
    },
    _query: query,
  } as any
}

const createMockSession = (data: Record<string, unknown> = {}) => ({
  data,
  update: vi.fn(async (newData: any) => {
    Object.assign(data, newData)
  }),
})

describe('Server Routes - /cart/claim', () => {
  beforeAll(async () => {
    vi.stubGlobal('defineEventHandler', (fn: any) => fn)
    const mod = await import('../../../../../server/routes/cart/claim.get')
    claimHandler = mod.default as (event: any) => Promise<unknown>
  })

  beforeEach(() => {
    vi.clearAllMocks()

    vi.stubGlobal('useRuntimeConfig', vi.fn().mockReturnValue({
      apiBaseUrl: 'https://api.test/api/v1',
      session: { password: 'test-password' },
      public: { djangoHostName: 'api.test' },
    }))
    vi.stubGlobal('getValidatedQuery', vi.fn(async (event: any, validator: any) => validator(event._query)))
    vi.stubGlobal('sendRedirect', vi.fn(async (event: any, location: string) => {
      event._redirectedTo = location
    }))
    vi.stubGlobal('useLogger', vi.fn().mockReturnValue({ set: vi.fn() }))
    vi.stubGlobal('log', { info: vi.fn(), warn: vi.fn(), error: vi.fn() })
    // zRetrieveCartResponse is normally the full auto-imported OpenAPI
    // schema; a permissive stand-in keeps this a route-logic test rather
    // than a Django-contract test (that belongs with the OpenAPI schema).
    vi.stubGlobal('zRetrieveCartResponse', z.object({ uuid: z.string() }).loose())
    vi.stubGlobal('parseDataAs', realParseDataAs)
    vi.stubGlobal('useCartSession', realUseCartSession)

    // cartSession.ts internals
    vi.stubGlobal('getRequestProtocol', vi.fn().mockReturnValue('https'))
    vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue('localhost'))
    vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue(null))
  })

  it('adopts a valid claimed cart into the session and redirects to /cart', async () => {
    const event = createMockEvent({ uuid: VALID_CART_UUID })
    const mockSession = createMockSession({})
    vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ uuid: VALID_CART_UUID, items: [] }))

    await claimHandler(event)

    expect(mockSession.update).toHaveBeenCalledWith({ cartId: VALID_CART_UUID })
    expect(event._redirectedTo).toBe('/cart')
  })

  it('sends the claimed uuid as X-Cart-Id when probing the backend', async () => {
    const event = createMockEvent({ uuid: VALID_CART_UUID })
    const mockSession = createMockSession({})
    vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
    const fetchMock = vi.fn().mockResolvedValue({ uuid: VALID_CART_UUID, items: [] })
    vi.stubGlobal('$fetch', fetchMock)

    await claimHandler(event)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/v1/cart',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ 'X-Cart-Id': VALID_CART_UUID }),
      }),
    )
  })

  it('redirects to /cart without touching the session when the uuid is malformed', async () => {
    const event = createMockEvent({ uuid: 'not-a-uuid' })
    const mockSession = createMockSession({ cartId: 'existing-real-cart' })
    vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
    const fetchMock = vi.fn()
    vi.stubGlobal('$fetch', fetchMock)

    await claimHandler(event)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockSession.update).not.toHaveBeenCalled()
    expect(mockSession.data.cartId).toBe('existing-real-cart')
    expect(event._redirectedTo).toBe('/cart')
  })

  it('redirects to /cart without touching the session when the uuid query param is missing', async () => {
    const event = createMockEvent({})
    const mockSession = createMockSession({ cartId: 'existing-real-cart' })
    vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
    const fetchMock = vi.fn()
    vi.stubGlobal('$fetch', fetchMock)

    await claimHandler(event)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockSession.update).not.toHaveBeenCalled()
    expect(event._redirectedTo).toBe('/cart')
  })

  it('redirects to /cart without touching the session when the cart is unknown to the backend (404)', async () => {
    const event = createMockEvent({ uuid: UNKNOWN_CART_UUID })
    const mockSession = createMockSession({ cartId: 'existing-real-cart' })
    vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(Object.assign(new Error('Not Found'), { statusCode: 404 })))

    await claimHandler(event)

    expect(mockSession.update).not.toHaveBeenCalled()
    expect(mockSession.data.cartId).toBe('existing-real-cart')
    expect(event._redirectedTo).toBe('/cart')
  })
})
