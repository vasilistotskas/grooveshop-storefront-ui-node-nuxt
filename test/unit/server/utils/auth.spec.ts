import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHeaders, getAllAuthSessionToken, getAllAuthAccessToken } from '../../../../server/utils/auth'

describe('Server Utils - Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createHeaders', () => {
    it('should create headers with Content-Type', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders()

      expect(headers['Content-Type']).toBe('application/json')
    })

    it('should include session token when provided', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders('test-session-token')

      expect(headers['X-Session-Token']).toBe('test-session-token')
    })

    it('should include access token when provided', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders(null, 'test-access-token')

      expect(headers['Authorization']).toBe('Bearer test-access-token')
    })

    it('should include both session and access tokens', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders('session-token', 'access-token')

      expect(headers['X-Session-Token']).toBe('session-token')
      expect(headers['Authorization']).toBe('Bearer access-token')
    })

    it('should include X-Forwarded-Host when host is available', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue('example.com'))

      const headers = createHeaders()

      expect(headers['X-Forwarded-Host']).toBe('example.com')
    })

    it('should include User-Agent from request headers', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({
        'user-agent': 'Mozilla/5.0',
      }))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders()

      expect(headers['User-Agent']).toBe('Mozilla/5.0')
    })

    it('should include X-Forwarded-For from request headers', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({
        'x-forwarded-for': '192.168.1.1',
      }))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders()

      expect(headers['X-Forwarded-For']).toBe('192.168.1.1')
    })

    it('should create complete headers with all fields', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-for': '192.168.1.1',
      }))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue('example.com'))

      const headers = createHeaders('session-token', 'access-token')

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-Forwarded-Host': 'example.com',
        'X-Session-Token': 'session-token',
        'Authorization': 'Bearer access-token',
        'User-Agent': 'Mozilla/5.0',
        'X-Forwarded-For': '192.168.1.1',
      })
    })

    it('should not include session token when null', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders(null, 'access-token')

      expect(headers).not.toHaveProperty('X-Session-Token')
      expect(headers['Authorization']).toBe('Bearer access-token')
    })

    it('should not include access token when null', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders('session-token', null)

      expect(headers['X-Session-Token']).toBe('session-token')
      expect(headers).not.toHaveProperty('Authorization')
    })
  })

  describe('getAllAuthSessionToken', () => {
    it('should return session token from user session', async () => {
      const mockEvent = {} as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getUserSession', vi.fn().mockResolvedValue({
        secure: {
          sessionToken: 'test-session-token',
        },
      }))

      const token = await getAllAuthSessionToken()

      expect(token).toBe('test-session-token')
    })

    it('should return undefined when no session token exists', async () => {
      const mockEvent = {} as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getUserSession', vi.fn().mockResolvedValue({
        secure: {},
      }))

      const token = await getAllAuthSessionToken()

      expect(token).toBeUndefined()
    })

    it('should return undefined when secure object is missing', async () => {
      const mockEvent = {} as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getUserSession', vi.fn().mockResolvedValue({}))

      const token = await getAllAuthSessionToken()

      expect(token).toBeUndefined()
    })
  })

  describe('getAllAuthAccessToken', () => {
    it('should return access token from user session', async () => {
      const mockEvent = {} as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getUserSession', vi.fn().mockResolvedValue({
        secure: {
          accessToken: 'test-access-token',
        },
      }))

      const token = await getAllAuthAccessToken()

      expect(token).toBe('test-access-token')
    })

    it('should return undefined when no access token exists', async () => {
      const mockEvent = {} as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getUserSession', vi.fn().mockResolvedValue({
        secure: {},
      }))

      const token = await getAllAuthAccessToken()

      expect(token).toBeUndefined()
    })

    it('should use provided event instead of useEvent', async () => {
      const providedEvent = { id: 'custom-event' } as any

      vi.stubGlobal('getUserSession', vi.fn().mockResolvedValue({
        secure: {
          accessToken: 'custom-token',
        },
      }))

      const token = await getAllAuthAccessToken(providedEvent)

      expect(token).toBe('custom-token')
      expect(getUserSession).toHaveBeenCalledWith(providedEvent)
    })

    it('should handle null session', async () => {
      const mockEvent = {} as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getUserSession', vi.fn().mockResolvedValue(null))

      const token = await getAllAuthAccessToken()

      expect(token).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string tokens', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders('', '')

      // Empty strings are falsy, so they won't be included
      expect(headers).not.toHaveProperty('X-Session-Token')
      expect(headers).not.toHaveProperty('Authorization')
    })

    it('should handle undefined tokens', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders(undefined, undefined)

      expect(headers).not.toHaveProperty('X-Session-Token')
      expect(headers).not.toHaveProperty('Authorization')
    })

    it('should handle missing request headers gracefully', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders()

      expect(headers['Content-Type']).toBe('application/json')
      expect(headers).not.toHaveProperty('User-Agent')
      expect(headers).not.toHaveProperty('X-Forwarded-For')
    })
  })
})
