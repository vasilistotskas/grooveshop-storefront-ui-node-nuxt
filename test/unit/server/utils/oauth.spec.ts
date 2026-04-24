import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  captureOAuthProcess,
  readAndClearOAuthProcess,
  storeOAuthTokensAndRedirect,
  redirectOAuthError,
  OAUTH_PROCESS_COOKIE,
} from '../../../../server/utils/oauth'

describe('Server Utils - OAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('captureOAuthProcess', () => {
    it('should set cookie with specified process when no code or error', () => {
      const mockEvent = {} as any
      const mockSetCookie = vi.fn()
      vi.stubGlobal('setCookie', mockSetCookie)

      captureOAuthProcess(mockEvent, { process: 'connect' })

      expect(mockSetCookie).toHaveBeenCalledWith(
        mockEvent,
        OAUTH_PROCESS_COOKIE,
        'connect',
        expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
      )
    })

    it('should default process to "login" when not in query', () => {
      const mockEvent = {} as any
      const mockSetCookie = vi.fn()
      vi.stubGlobal('setCookie', mockSetCookie)

      captureOAuthProcess(mockEvent, {})

      expect(mockSetCookie).toHaveBeenCalledWith(
        mockEvent,
        OAUTH_PROCESS_COOKIE,
        'login',
        expect.any(Object),
      )
    })

    it('should not set cookie when code param is present (OAuth callback)', () => {
      const mockEvent = {} as any
      const mockSetCookie = vi.fn()
      vi.stubGlobal('setCookie', mockSetCookie)

      captureOAuthProcess(mockEvent, { code: 'auth_code_from_provider' })

      expect(mockSetCookie).not.toHaveBeenCalled()
    })

    it('should not set cookie when error param is present (OAuth error)', () => {
      const mockEvent = {} as any
      const mockSetCookie = vi.fn()
      vi.stubGlobal('setCookie', mockSetCookie)

      captureOAuthProcess(mockEvent, { error: 'access_denied' })

      expect(mockSetCookie).not.toHaveBeenCalled()
    })

    it('should not set cookie when both code and error are present', () => {
      const mockEvent = {} as any
      const mockSetCookie = vi.fn()
      vi.stubGlobal('setCookie', mockSetCookie)

      captureOAuthProcess(mockEvent, { code: 'abc', error: 'something' })

      expect(mockSetCookie).not.toHaveBeenCalled()
    })
  })

  describe('readAndClearOAuthProcess', () => {
    it('should return "login" as default when cookie is absent', () => {
      const mockEvent = {} as any
      vi.stubGlobal('getCookie', vi.fn().mockReturnValue(undefined))
      vi.stubGlobal('deleteCookie', vi.fn())

      const result = readAndClearOAuthProcess(mockEvent)

      expect(result).toBe('login')
    })

    it('should return "connect" when cookie is set to connect', () => {
      const mockEvent = {} as any
      vi.stubGlobal('getCookie', vi.fn().mockReturnValue('connect'))
      vi.stubGlobal('deleteCookie', vi.fn())

      const result = readAndClearOAuthProcess(mockEvent)

      expect(result).toBe('connect')
    })

    it('should always delete the cookie after reading', () => {
      const mockEvent = {} as any
      const mockDeleteCookie = vi.fn()
      vi.stubGlobal('getCookie', vi.fn().mockReturnValue('login'))
      vi.stubGlobal('deleteCookie', mockDeleteCookie)

      readAndClearOAuthProcess(mockEvent)

      expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, OAUTH_PROCESS_COOKIE)
    })

    it('should delete cookie even when not set', () => {
      const mockEvent = {} as any
      const mockDeleteCookie = vi.fn()
      vi.stubGlobal('getCookie', vi.fn().mockReturnValue(null))
      vi.stubGlobal('deleteCookie', mockDeleteCookie)

      readAndClearOAuthProcess(mockEvent)

      expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, OAUTH_PROCESS_COOKIE)
    })
  })

  describe('storeOAuthTokensAndRedirect', () => {
    it('should store all oauth params in session', async () => {
      const mockEvent = {} as any
      const mockReplaceUserSession = vi.fn().mockResolvedValue(undefined)
      const mockSendRedirect = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('replaceUserSession', mockReplaceUserSession)
      vi.stubGlobal('sendRedirect', mockSendRedirect)

      await storeOAuthTokensAndRedirect(
        mockEvent,
        'google',
        { access_token: 'acc123', id_token: 'id123' },
        'client123',
        'login',
      )

      expect(mockReplaceUserSession).toHaveBeenCalledWith(mockEvent, {
        secure: {
          oauthParams: {
            provider: 'google',
            access_token: 'acc123',
            id_token: 'id123',
            client_id: 'client123',
            process: 'login',
          },
        },
      })
    })

    it('should redirect to /account/provider/callback with provider and process', async () => {
      const mockEvent = {} as any
      vi.stubGlobal('replaceUserSession', vi.fn().mockResolvedValue(undefined))
      const mockSendRedirect = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('sendRedirect', mockSendRedirect)

      await storeOAuthTokensAndRedirect(
        mockEvent,
        'google',
        { access_token: 'acc123', id_token: 'id123' },
        'client123',
        'login',
      )

      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('/account/provider/callback'),
      )
      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('provider=google'),
      )
      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('process=login'),
      )
    })

    it('should handle null/undefined optional tokens gracefully', async () => {
      const mockEvent = {} as any
      const mockReplaceUserSession = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('replaceUserSession', mockReplaceUserSession)
      vi.stubGlobal('sendRedirect', vi.fn().mockResolvedValue(undefined))

      await storeOAuthTokensAndRedirect(
        mockEvent,
        'facebook',
        { access_token: 'acc123', id_token: null },
        undefined,
        'connect',
      )

      expect(mockReplaceUserSession).toHaveBeenCalledWith(mockEvent, {
        secure: {
          oauthParams: {
            provider: 'facebook',
            access_token: 'acc123',
            id_token: undefined,
            client_id: undefined,
            process: 'connect',
          },
        },
      })
    })

    it('should use connect process in redirect URL', async () => {
      const mockEvent = {} as any
      vi.stubGlobal('replaceUserSession', vi.fn().mockResolvedValue(undefined))
      const mockSendRedirect = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('sendRedirect', mockSendRedirect)

      await storeOAuthTokensAndRedirect(
        mockEvent,
        'github',
        {},
        'cid',
        'connect',
      )

      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('process=connect'),
      )
    })
  })

  describe('redirectOAuthError', () => {
    it('should delete the process cookie', async () => {
      const mockEvent = {} as any
      const mockDeleteCookie = vi.fn()
      vi.stubGlobal('deleteCookie', mockDeleteCookie)
      vi.stubGlobal('sendRedirect', vi.fn().mockResolvedValue(undefined))

      await redirectOAuthError(mockEvent, 'google')

      expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, OAUTH_PROCESS_COOKIE)
    })

    it('should redirect to /account/provider/callback with error=oauth_error', async () => {
      const mockEvent = {} as any
      vi.stubGlobal('deleteCookie', vi.fn())
      const mockSendRedirect = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('sendRedirect', mockSendRedirect)

      await redirectOAuthError(mockEvent, 'google')

      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('/account/provider/callback'),
      )
      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('error=oauth_error'),
      )
      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('provider=google'),
      )
    })

    it('should include the correct provider in redirect for different providers', async () => {
      const mockEvent = {} as any
      vi.stubGlobal('deleteCookie', vi.fn())
      const mockSendRedirect = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('sendRedirect', mockSendRedirect)

      await redirectOAuthError(mockEvent, 'facebook')

      expect(mockSendRedirect).toHaveBeenCalledWith(
        mockEvent,
        expect.stringContaining('provider=facebook'),
      )
    })
  })
})
