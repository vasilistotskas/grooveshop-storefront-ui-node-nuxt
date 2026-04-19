import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHeaders, getAllAuthSessionToken, getAllAuthAccessToken } from '../../../../server/utils/auth'

describe('Server Utils - Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // getRequestProtocol is used by createHeaders() to set X-Forwarded-Proto
    vi.stubGlobal('getRequestProtocol', vi.fn().mockReturnValue('https'))
    // getRequestIP is used by createHeaders() to set X-Real-IP for allauth
    vi.stubGlobal('getRequestIP', vi.fn().mockReturnValue(undefined))
    // createHeaders() calls useRuntimeConfig() to get the public Django hostname
    vi.stubGlobal('useRuntimeConfig', vi.fn().mockReturnValue({
      public: { djangoHostName: '' },
    }))
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

    it('should prefer config djangoHostName over request host for X-Forwarded-Host', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue('10.42.0.180:3000'))
      vi.stubGlobal('useRuntimeConfig', vi.fn().mockReturnValue({
        public: { djangoHostName: 'api.webside.gr' },
      }))

      const headers = createHeaders()

      expect(headers['X-Forwarded-Host']).toBe('api.webside.gr')
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

    it('should set X-Real-IP from getRequestIP for allauth session tracking', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))
      vi.stubGlobal('getRequestIP', vi.fn().mockReturnValue('203.0.113.42'))

      const headers = createHeaders()

      expect(headers['X-Real-IP']).toBe('203.0.113.42')
    })

    it('should omit X-Real-IP when getRequestIP returns undefined', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))
      vi.stubGlobal('getRequestIP', vi.fn().mockReturnValue(undefined))

      const headers = createHeaders()

      expect(headers).not.toHaveProperty('X-Real-IP')
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
      vi.stubGlobal('getRequestIP', vi.fn().mockReturnValue('192.168.1.1'))

      const headers = createHeaders('session-token', 'access-token')

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': 'example.com',
        'X-Session-Token': 'session-token',
        'Authorization': 'Bearer access-token',
        'User-Agent': 'Mozilla/5.0',
        'X-Real-IP': '192.168.1.1',
        'X-Forwarded-For': '192.168.1.1',
        'X-Language': 'el',
      })
    })

    it('should forward X-Language from event.context.locale', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
        context: { locale: 'en' },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders()

      expect(headers['X-Language']).toBe('en')
    })

    it('should fall back to DEFAULT_LOCALE when event.context.locale is missing', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders()

      expect(headers['X-Language']).toBe('el')
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

  describe('createHeaders - Additional Coverage', () => {
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
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('should include X-Forwarded-Host when host is present', () => {
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

    it('should include all headers when all data is present', () => {
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

      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['X-Forwarded-Host']).toBe('example.com')
      expect(headers['X-Session-Token']).toBe('session-token')
      expect(headers['Authorization']).toBe('Bearer access-token')
      expect(headers['User-Agent']).toBe('Mozilla/5.0')
      expect(headers['X-Forwarded-For']).toBe('192.168.1.1')
    })

    it('should handle null tokens', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders(null, null)

      expect(headers['X-Session-Token']).toBeUndefined()
      expect(headers['Authorization']).toBeUndefined()
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('should handle undefined tokens', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders(undefined, undefined)

      expect(headers['X-Session-Token']).toBeUndefined()
      expect(headers['Authorization']).toBeUndefined()
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('should handle empty string tokens', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({}))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders('', '')

      // Empty strings are falsy, so they won't be included
      expect(headers['X-Session-Token']).toBeUndefined()
      expect(headers['Authorization']).toBeUndefined()
    })

    it('should handle missing user-agent in request headers', () => {
      const mockEvent = {
        node: { req: { headers: {} } },
      } as any

      vi.stubGlobal('useEvent', vi.fn().mockReturnValue(mockEvent))
      vi.stubGlobal('getRequestHeaders', vi.fn().mockReturnValue({
        'x-forwarded-for': '192.168.1.1',
      }))
      vi.stubGlobal('getRequestHost', vi.fn().mockReturnValue(null))

      const headers = createHeaders()

      expect(headers['User-Agent']).toBeUndefined()
      expect(headers['X-Forwarded-For']).toBe('192.168.1.1')
    })

    it('should handle missing x-forwarded-for in request headers', () => {
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
      expect(headers['X-Forwarded-For']).toBeUndefined()
    })
  })
})
