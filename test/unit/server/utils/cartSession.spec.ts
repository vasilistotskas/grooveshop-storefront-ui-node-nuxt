import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCartSession, updateCartSession, getCartHeaders, handleCartResponse, useCartSession } from '../../../../server/utils/cartSession'

// Guest carts are addressed by their UUID (the backend rejects integer PKs),
// so the session cart id is an unguessable UUID string.
const CART_A = '11111111-1111-4111-8111-111111111111'
const CART_B = '22222222-2222-4222-8222-222222222222'
const CART_C = '33333333-3333-4333-8333-333333333333'
const CART_D = '44444444-4444-4444-8444-444444444444'

// Mock H3 event — h3's getCookie/setCookie helpers read from
// event.node.req.headers.cookie and mutate event.node.res via getHeader/
// setHeader, so mocks must provide enough of that shape for the fallback
// cart-id cookie path introduced alongside the encrypted session.
const createMockEvent = (sessionData: any = {}, accessToken?: string) => {
  const resHeaders: Record<string, string | string[]> = {}
  return {
    context: {},
    node: {
      req: {
        headers: {} as Record<string, string | string[] | undefined>,
      },
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
    _sessionData: sessionData,
    _accessToken: accessToken,
    _resHeaders: resHeaders,
  } as any
}

// Mock session
const createMockSession = (data: any = {}) => {
  return {
    data,
    update: vi.fn(async (newData: any) => {
      Object.assign(data, newData)
    }),
  }
}

describe('Server Utils - Cart Session', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    vi.stubGlobal('useRuntimeConfig', vi.fn().mockReturnValue({
      session: {
        password: 'test-password',
      },
      public: { djangoHostName: '' },
    }))

    // getRequestProtocol is used by getCartHeaders() to set X-Forwarded-Proto
    vi.stubGlobal('getRequestProtocol', vi.fn().mockReturnValue('https'))
    // getRequestHost is used by getCartHeaders() as fallback for X-Forwarded-Host
    vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue('localhost'))
  })

  describe('getCartSession', () => {
    it('should return empty session data for new session', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const result = await getCartSession(event)

      expect(result).toEqual({})
    })

    it('should return existing cart session data', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_A })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const result = await getCartSession(event)

      expect(result).toEqual({ cartId: CART_A })
    })

    it('should handle session with multiple properties', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({
        cartId: CART_A,
        customData: 'test',
      })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const result = await getCartSession(event)

      expect(result.cartId).toBe(CART_A)
      expect(result.customData).toBe('test')
    })
  })

  describe('updateCartSession', () => {
    it('should update cart session with new cart ID', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await updateCartSession(event, { cartId: CART_B })

      expect(mockSession.update).toHaveBeenCalledWith({ cartId: CART_B })
    })

    it('should merge updates with existing session data', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_A, existingData: 'keep' })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await updateCartSession(event, { cartId: CART_B })

      expect(mockSession.update).toHaveBeenCalledWith({
        cartId: CART_B,
        existingData: 'keep',
      })
    })

    it('should handle partial updates', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_A })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await updateCartSession(event, { customField: 'value' })

      expect(mockSession.update).toHaveBeenCalledWith({
        cartId: CART_A,
        customField: 'value',
      })
    })

    it('should handle empty updates', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_A })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await updateCartSession(event, {})

      expect(mockSession.update).toHaveBeenCalledWith({ cartId: CART_A })
    })
  })

  describe('getCartHeaders', () => {
    it('should return only proxy headers for new session', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue(null))

      const headers = await getCartHeaders(event)

      expect(headers).toEqual({ 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': 'localhost', 'X-Language': 'el' })
    })

    it('should include cart ID header when cart exists', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_A })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue(null))

      const headers = await getCartHeaders(event)

      expect(headers['X-Cart-Id']).toBe(CART_A)
    })

    it('should include authorization header when user is authenticated', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue('test-token'))

      const headers = await getCartHeaders(event)

      expect(headers['Authorization']).toBe('Bearer test-token')
    })

    it('should include both cart ID and authorization headers', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_A })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue('test-token'))

      const headers = await getCartHeaders(event)

      expect(headers['X-Cart-Id']).toBe(CART_A)
      expect(headers['Authorization']).toBe('Bearer test-token')
    })

    it('should send the cart UUID as a string', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_D })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue(null))

      const headers = await getCartHeaders(event)

      expect(headers['X-Cart-Id']).toBe(CART_D)
      expect(typeof headers['X-Cart-Id']).toBe('string')
    })
  })

  describe('handleCartResponse', () => {
    it('should update session with cart UUID from response', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})
      const response = { uuid: CART_C, items: [] }

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await handleCartResponse(event, response)

      expect(mockSession.update).toHaveBeenCalledWith({ cartId: CART_C })
    })

    it('should not update session if response has no UUID', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})
      const response = { items: [] }

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await handleCartResponse(event, response)

      expect(mockSession.update).not.toHaveBeenCalled()
    })

    it('should not update session for an empty UUID', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})
      const response = { uuid: '', items: [] }

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await handleCartResponse(event, response)

      // An empty UUID means "no cart yet", so it won't update.
      expect(mockSession.update).not.toHaveBeenCalled()
    })

    it('should update session with new cart UUID', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_A })
      const response = { uuid: CART_B, items: [] }

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await handleCartResponse(event, response)

      expect(mockSession.update).toHaveBeenCalledWith({
        cartId: CART_B,
      })
    })
  })

  describe('useCartSession', () => {
    it('should return cart session utilities', () => {
      const event = createMockEvent()
      const utils = useCartSession(event)

      expect(utils).toHaveProperty('getSession')
      expect(utils).toHaveProperty('updateSession')
      expect(utils).toHaveProperty('getCartHeaders')
      expect(utils).toHaveProperty('handleCartResponse')
      expect(typeof utils.getSession).toBe('function')
      expect(typeof utils.updateSession).toBe('function')
      expect(typeof utils.getCartHeaders).toBe('function')
      expect(typeof utils.handleCartResponse).toBe('function')
    })

    it('should call getCartSession when getSession is called', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_A })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const utils = useCartSession(event)
      const result = await utils.getSession()

      expect(result).toEqual({ cartId: CART_A })
    })

    it('should call updateCartSession when updateSession is called', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const utils = useCartSession(event)
      await utils.updateSession({ cartId: CART_B })

      expect(mockSession.update).toHaveBeenCalled()
    })

    it('should call getCartHeaders when getCartHeaders is called', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_A })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue('token'))

      const utils = useCartSession(event)
      const headers = await utils.getCartHeaders()

      expect(headers['X-Cart-Id']).toBe(CART_A)
      expect(headers['Authorization']).toBe('Bearer token')
    })

    it('should call handleCartResponse when handleCartResponse is called', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})
      const response = { uuid: CART_C }

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const utils = useCartSession(event)
      await utils.handleCartResponse(response)

      expect(mockSession.update).toHaveBeenCalledWith({ cartId: CART_C })
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete cart creation flow', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue(null))

      // 1. Get initial session (empty)
      const initialSession = await getCartSession(event)
      expect(initialSession).toEqual({})

      // 2. Get headers (no cart ID yet, only proxy header)
      const initialHeaders = await getCartHeaders(event)
      expect(initialHeaders).toEqual({ 'X-Forwarded-Proto': 'https', 'X-Forwarded-Host': 'localhost', 'X-Language': 'el' })

      // 3. Handle cart response (creates cart)
      await handleCartResponse(event, { uuid: CART_A, items: [] })

      // 4. Get updated session
      const updatedSession = await getCartSession(event)
      expect(updatedSession.cartId).toBe(CART_A)

      // 5. Get headers with cart ID
      const updatedHeaders = await getCartHeaders(event)
      expect(updatedHeaders['X-Cart-Id']).toBe(CART_A)
    })

    it('should handle cart merge on login', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: CART_A })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn()
        .mockResolvedValueOnce(null) // Before login
        .mockResolvedValueOnce('new-token')) // After login

      // 1. Guest cart exists
      const guestHeaders = await getCartHeaders(event)
      expect(guestHeaders['X-Cart-Id']).toBe(CART_A)
      expect(guestHeaders['Authorization']).toBeUndefined()

      // 2. User logs in, cart merges
      await handleCartResponse(event, { uuid: CART_B, items: [] })

      // 3. New cart ID with auth token
      const authHeaders = await getCartHeaders(event)
      expect(authHeaders['X-Cart-Id']).toBe(CART_B)
      expect(authHeaders['Authorization']).toBe('Bearer new-token')
    })
  })
})
