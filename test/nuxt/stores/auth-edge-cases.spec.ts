import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'

vi.mock('#app', () => ({
  useNuxtApp: () => ({}),
  useRequestHeaders: () => ({}),
  useUserSession: () => ({
    loggedIn: { value: true },
    user: { value: { id: 1 } },
    clear: vi.fn(),
  }),
}))

const mockGetSession = vi.fn()
const mockGetSessions = vi.fn()
const mockGetAuthenticators = vi.fn()

vi.mock('~/composables/useAllAuthAuthentication', () => ({
  default: () => ({
    getSession: mockGetSession,
  }),
  useAllAuthAuthentication: () => ({
    getSession: mockGetSession,
  }),
}))

vi.mock('~/composables/useAllAuthSessions', () => ({
  useAllAuthSessions: () => ({
    getSessions: mockGetSessions,
  }),
}))

vi.mock('~/composables/useAllAuthAccount', () => ({
  useAllAuthAccount: () => ({
    getAuthenticators: mockGetAuthenticators,
  }),
}))

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('Auth Store - Edge Cases & Critical Flows', () => {
  let store: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAuthStore()
    mockFetch.mockReset()
    mockGetSession.mockReset()
    mockGetSessions.mockReset()
    mockGetAuthenticators.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication Flow Edge Cases', () => {
    it('should handle missing socialaccount in config', () => {
      store.config = {
        account: { authentication_method: 'email' },
      } as any

      expect(store.hasSocialAccountProviders).toBe(false)
    })

    it('should handle null config gracefully', () => {
      store.config = null as any
      expect(store.hasSocialAccountProviders).toBe(false)
    })

    it('should handle empty providers array', () => {
      store.config = {
        socialaccount: { providers: [] },
      } as any

      expect(store.hasSocialAccountProviders).toBe(false)
    })

    it('should handle session without user', () => {
      store.session = {} as any
      expect(store.hasCurrentPassword).toBe(false)
    })

    it('should handle null session user', () => {
      store.session = { user: null } as any
      expect(store.hasCurrentPassword).toBe(false)
    })
  })

  describe('Session Management', () => {
    it('should handle session refresh with encrypted token', async () => {
      const mockSessionData = {
        data: {
          user: { id: 1, email: 'test@example.com' },
        },
      } as any

      mockGetSession.mockResolvedValueOnce(mockSessionData)

      await store.refreshSession('encrypted_token_123')

      expect(mockGetSession).toHaveBeenCalledWith('encrypted_token_123')
      expect(store.session).toEqual(mockSessionData.data)
    })

    it('should handle session refresh without token', async () => {
      const mockSessionData = {
        data: {
          user: { id: 1, email: 'test@example.com' },
        },
      } as any

      mockGetSession.mockResolvedValueOnce(mockSessionData)

      await store.refreshSession()

      expect(mockGetSession).toHaveBeenCalledWith(null)
      expect(store.session).toEqual(mockSessionData.data)
    })

    it('should handle session refresh failure', async () => {
      mockGetSession.mockResolvedValueOnce(null)

      await store.refreshSession()

      expect(store.session).toBeUndefined()
    })
  })

  describe('Multiple Sessions Handling', () => {
    it('should filter current session from other sessions', () => {
      store.sessions = [
        { id: 1, is_current: true } as any,
        { id: 2, is_current: false } as any,
        { id: 3, is_current: false } as any,
      ]

      const others = store.otherSessions
      expect(others.length).toBe(2)
      expect(others.every(s => !s.is_current)).toBe(true)
    })

    it('should handle all sessions being current', () => {
      store.sessions = [
        { id: 1, is_current: true } as any,
        { id: 2, is_current: true } as any,
      ]

      expect(store.otherSessions).toEqual([])
    })

    it('should handle undefined sessions', () => {
      store.sessions = undefined as any
      // When sessions is undefined, otherSessions will also be undefined
      expect(store.otherSessions).toBeUndefined()
    })
  })

  describe('Multi-Factor Authentication', () => {
    it('should handle multiple authenticators of same type', () => {
      store.authenticators = [
        { id: 1, type: 'totp' as AuthenticatorType } as any,
        { id: 2, type: 'totp' as AuthenticatorType } as any,
      ]

      // Should return first match
      const totp = store.totpAuthenticator
      expect(totp?.id).toBe(1)
    })

    it('should handle empty authenticators array', () => {
      store.authenticators = []

      expect(store.totpAuthenticator).toBeUndefined()
      expect(store.webauthnAuthenticator).toBeUndefined()
      expect(store.recoveryCodesAuthenticator).toBeUndefined()
    })

    it('should handle undefined authenticators', () => {
      store.authenticators = undefined

      expect(store.totpAuthenticator).toBeUndefined()
      expect(store.webauthnAuthenticator).toBeUndefined()
      expect(store.recoveryCodesAuthenticator).toBeUndefined()
    })

    it('should handle mixed authenticator types', () => {
      store.authenticators = [
        { id: 1, type: 'totp' as AuthenticatorType } as any,
        { id: 2, type: 'webauthn' as AuthenticatorType } as any,
      ]

      expect(store.totpAuthenticator?.id).toBe(1)
      expect(store.webauthnAuthenticator?.id).toBe(2)
      expect(store.recoveryCodesAuthenticator).toBeUndefined()
    })
  })

  describe('Setup Methods Error Handling', () => {
    it('should handle network timeout in setupConfig', async () => {
      const timeoutError = new Error('Network timeout')
      mockFetch.mockRejectedValueOnce(timeoutError)

      await store.setupConfig()

      expect(store.status.config).toBe('error')
      expect(store.error.config).toBe(timeoutError)
      expect(store.config).toBeUndefined()
    })

    it('should handle 401 unauthorized in setupConfig', async () => {
      const authError = { status: 401, message: 'Unauthorized' }
      mockFetch.mockRejectedValueOnce(authError)

      await store.setupConfig()

      expect(store.status.config).toBe('error')
      expect(store.error.config).toStrictEqual(authError)
    })

    it('should handle malformed response in setupConfig', async () => {
      mockFetch.mockResolvedValueOnce({ invalid: 'data' })

      await store.setupConfig()

      // The store will set whatever data is returned
      expect(store.status.config).toBe('success')
    })
  })

  describe('State Cleanup', () => {
    it('should completely clear all auth state', () => {
      // Set up full state
      store.session = { user: { id: 1 } } as any
      store.sessions = [{ id: 1 }, { id: 2 }] as any
      store.authenticators = [{ id: 1 }] as any
      store.config = { account: {} } as any

      store.clearAuthState()

      expect(store.session).toBeUndefined()
      expect(store.sessions).toEqual([])
      expect(store.authenticators).toBeUndefined()
      // Config should remain
      expect(store.config).toBeDefined()
    })

    it('should be idempotent when called multiple times', () => {
      store.session = { user: { id: 1 } } as any

      store.clearAuthState()
      store.clearAuthState()
      store.clearAuthState()

      expect(store.session).toBeUndefined()
      expect(store.sessions).toEqual([])
      expect(store.authenticators).toBeUndefined()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple setupConfig calls', async () => {
      const mockConfig = {
        status: 200,
        data: { account: { authentication_method: 'email' } },
      }

      mockFetch.mockResolvedValue(mockConfig)

      // Call multiple times concurrently
      await Promise.all([
        store.setupConfig(),
        store.setupConfig(),
        store.setupConfig(),
      ])

      // Should have been called 3 times
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(store.config).toEqual(mockConfig.data)
      expect(store.status.config).toBe('success')
    })

    it('should handle rapid state changes', () => {
      const session1 = { user: { id: 1 } } as any
      const session2 = { user: { id: 2 } } as any

      store.session = session1
      store.session = session2
      store.clearAuthState()

      expect(store.session).toBeUndefined()
    })
  })

  describe('Password Management', () => {
    it('should detect social-only accounts (no password)', () => {
      store.session = {
        user: {
          id: 1,
          email: 'social@example.com',
          has_usable_password: false,
        },
      } as any

      expect(store.hasCurrentPassword).toBe(false)
    })

    it('should detect accounts with password', () => {
      store.session = {
        user: {
          id: 1,
          email: 'user@example.com',
          has_usable_password: true,
        },
      } as any

      expect(store.hasCurrentPassword).toBe(true)
    })

    it('should handle undefined has_usable_password', () => {
      store.session = {
        user: {
          id: 1,
          email: 'user@example.com',
        },
      } as any

      // When has_usable_password is undefined, hasCurrentPassword returns undefined
      expect(store.hasCurrentPassword).toBeUndefined()
    })
  })

  describe('Status Transitions', () => {
    it('should transition through all status states correctly', async () => {
      expect(store.status.config).toBe('idle')

      const mockConfig = {
        status: 200,
        data: { account: {} },
      }

      let resolvePromise: any
      mockFetch.mockImplementation(() => new Promise(resolve => {
        resolvePromise = resolve
      }))

      const promise = store.setupConfig()
      expect(store.status.config).toBe('pending')

      resolvePromise(mockConfig)
      await promise

      expect(store.status.config).toBe('success')
    })

    it('should transition to error state on failure', async () => {
      expect(store.status.config).toBe('idle')

      mockFetch.mockRejectedValueOnce(new Error('Failed'))

      await store.setupConfig()

      expect(store.status.config).toBe('error')
    })
  })
})
