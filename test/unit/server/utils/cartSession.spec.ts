import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCartSession, updateCartSession, getCartHeaders, handleCartResponse, useCartSession } from '../../../../server/utils/cartSession'

// Mock H3 event
const createMockEvent = (sessionData: any = {}, accessToken?: string) => {
  return {
    context: {},
    node: {
      req: {},
      res: {},
    },
    _sessionData: sessionData,
    _accessToken: accessToken,
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
    }))
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
      const mockSession = createMockSession({ cartId: 123 })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const result = await getCartSession(event)

      expect(result).toEqual({ cartId: 123 })
    })

    it('should handle session with multiple properties', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({
        cartId: 123,
        customData: 'test',
      })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const result = await getCartSession(event)

      expect(result.cartId).toBe(123)
      expect(result.customData).toBe('test')
    })
  })

  describe('updateCartSession', () => {
    it('should update cart session with new cart ID', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await updateCartSession(event, { cartId: 456 })

      expect(mockSession.update).toHaveBeenCalledWith({ cartId: 456 })
    })

    it('should merge updates with existing session data', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: 123, existingData: 'keep' })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await updateCartSession(event, { cartId: 456 })

      expect(mockSession.update).toHaveBeenCalledWith({
        cartId: 456,
        existingData: 'keep',
      })
    })

    it('should handle partial updates', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: 123 })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await updateCartSession(event, { customField: 'value' })

      expect(mockSession.update).toHaveBeenCalledWith({
        cartId: 123,
        customField: 'value',
      })
    })

    it('should handle empty updates', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: 123 })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await updateCartSession(event, {})

      expect(mockSession.update).toHaveBeenCalledWith({ cartId: 123 })
    })
  })

  describe('getCartHeaders', () => {
    it('should return empty headers for new session', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue(null))

      const headers = await getCartHeaders(event)

      expect(headers).toEqual({})
    })

    it('should include cart ID header when cart exists', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: 123 })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue(null))

      const headers = await getCartHeaders(event)

      expect(headers['X-Cart-Id']).toBe('123')
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
      const mockSession = createMockSession({ cartId: 123 })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue('test-token'))

      const headers = await getCartHeaders(event)

      expect(headers['X-Cart-Id']).toBe('123')
      expect(headers['Authorization']).toBe('Bearer test-token')
    })

    it('should convert cart ID to string', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: 999 })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue(null))

      const headers = await getCartHeaders(event)

      expect(headers['X-Cart-Id']).toBe('999')
      expect(typeof headers['X-Cart-Id']).toBe('string')
    })
  })

  describe('handleCartResponse', () => {
    it('should update session with cart ID from response', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})
      const response = { id: 789, items: [] }

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await handleCartResponse(event, response)

      expect(mockSession.update).toHaveBeenCalledWith({ cartId: 789 })
    })

    it('should not update session if response has no ID', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})
      const response = { items: [] }

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await handleCartResponse(event, response)

      expect(mockSession.update).not.toHaveBeenCalled()
    })

    it('should handle response with ID of 0', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})
      const response = { id: 0, items: [] }

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await handleCartResponse(event, response)

      // ID of 0 is falsy, so it won't update
      expect(mockSession.update).not.toHaveBeenCalled()
    })

    it('should update session with new cart ID', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: 123 })
      const response = { id: 456, items: [] }

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      await handleCartResponse(event, response)

      expect(mockSession.update).toHaveBeenCalledWith({
        cartId: 456,
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
      const mockSession = createMockSession({ cartId: 123 })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const utils = useCartSession(event)
      const result = await utils.getSession()

      expect(result).toEqual({ cartId: 123 })
    })

    it('should call updateCartSession when updateSession is called', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const utils = useCartSession(event)
      await utils.updateSession({ cartId: 456 })

      expect(mockSession.update).toHaveBeenCalled()
    })

    it('should call getCartHeaders when getCartHeaders is called', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: 123 })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn().mockResolvedValue('token'))

      const utils = useCartSession(event)
      const headers = await utils.getCartHeaders()

      expect(headers['X-Cart-Id']).toBe('123')
      expect(headers['Authorization']).toBe('Bearer token')
    })

    it('should call handleCartResponse when handleCartResponse is called', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({})
      const response = { id: 789 }

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))

      const utils = useCartSession(event)
      await utils.handleCartResponse(response)

      expect(mockSession.update).toHaveBeenCalledWith({ cartId: 789 })
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

      // 2. Get headers (no cart ID yet)
      const initialHeaders = await getCartHeaders(event)
      expect(initialHeaders).toEqual({})

      // 3. Handle cart response (creates cart)
      await handleCartResponse(event, { id: 123, items: [] })

      // 4. Get updated session
      const updatedSession = await getCartSession(event)
      expect(updatedSession.cartId).toBe(123)

      // 5. Get headers with cart ID
      const updatedHeaders = await getCartHeaders(event)
      expect(updatedHeaders['X-Cart-Id']).toBe('123')
    })

    it('should handle cart merge on login', async () => {
      const event = createMockEvent()
      const mockSession = createMockSession({ cartId: 123 })

      vi.stubGlobal('useSession', vi.fn().mockResolvedValue(mockSession))
      vi.stubGlobal('getAllAuthAccessToken', vi.fn()
        .mockResolvedValueOnce(null) // Before login
        .mockResolvedValueOnce('new-token')) // After login

      // 1. Guest cart exists
      const guestHeaders = await getCartHeaders(event)
      expect(guestHeaders['X-Cart-Id']).toBe('123')
      expect(guestHeaders['Authorization']).toBeUndefined()

      // 2. User logs in, cart merges
      await handleCartResponse(event, { id: 456, items: [] })

      // 3. New cart ID with auth token
      const authHeaders = await getCartHeaders(event)
      expect(authHeaders['X-Cart-Id']).toBe('456')
      expect(authHeaders['Authorization']).toBe('Bearer new-token')
    })
  })
})
