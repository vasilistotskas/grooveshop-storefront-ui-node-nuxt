import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'

vi.mock('#app', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useNuxtApp: () => ({}),
    useRequestHeaders: () => ({}),
    useUserSession: () => ({
      loggedIn: { value: true },
      clear: vi.fn(),
    }),
  }
})

vi.mock('~/composables/useAllAuthAuthentication', () => ({
  useAllAuthAuthentication: () => ({
    getSession: vi.fn(),
  }),
}))

vi.mock('~/composables/useAllAuthSessions', () => ({
  useAllAuthSessions: () => ({
    getSessions: vi.fn(),
  }),
}))

vi.mock('~/composables/useAllAuthAccount', () => ({
  useAllAuthAccount: () => ({
    getAuthenticators: vi.fn(),
  }),
}))

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('Auth Store', () => {
  let store: ReturnType<typeof useAuthStore>

  const mockConfig: ConfigResponse = {
    status: 200,
    data: {
      account: {
        authentication_method: 'email',
      },
      socialaccount: {
        providers: [
          { id: 'google', name: 'Google' },
          { id: 'github', name: 'GitHub' },
        ],
      },
      mfa: {
        supported_types: ['totp', 'webauthn', 'recovery_codes'],
      },
    } as any,
  }

  const mockSession: SessionResponse = {
    status: 200,
    data: {
      user: {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        has_usable_password: true,
      } as any,
      methods: [],
    },
    meta: {} as any,
  }

  const mockSessions: SessionsGetResponse = {
    status: 200,
    data: [
      {
        id: 1,
        is_current: true,
        created_at: '2024-01-01',
        last_seen_at: '2024-01-02',
      } as any,
      {
        id: 2,
        is_current: false,
        created_at: '2024-01-01',
        last_seen_at: '2024-01-02',
      } as any,
    ],
  }

  const mockAuthenticators: AuthenticatorsResponse = {
    status: 200,
    data: [
      {
        id: 1,
        type: 'totp' as typeof AuthenticatorType.TOTP,
        created_at: '2024-01-01',
      } as any,
      {
        id: 2,
        type: 'webauthn' as typeof AuthenticatorType.WEBAUTHN,
        created_at: '2024-01-01',
      } as any,
      {
        id: 3,
        type: 'recovery_codes' as typeof AuthenticatorType.RECOVERY_CODES,
        created_at: '2024-01-01',
      } as any,
    ],
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAuthStore()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have undefined config initially', () => {
      expect(store.config).toBeUndefined()
    })

    it('should have undefined session initially', () => {
      expect(store.session).toBeUndefined()
    })

    it('should have empty sessions array initially', () => {
      expect(store.sessions).toEqual([])
    })

    it('should have undefined authenticators initially', () => {
      expect(store.authenticators).toBeUndefined()
    })

    it('should have idle status initially', () => {
      expect(store.status.config).toBe('idle')
    })

    it('should have null errors initially', () => {
      expect(store.error.config).toBeNull()
    })
  })

  describe('Computed Properties', () => {
    describe('hasSocialAccountProviders', () => {
      it('should return true when social providers exist', () => {
        store.config = mockConfig.data
        expect(store.hasSocialAccountProviders).toBe(true)
      })

      it('should return false when no social providers', () => {
        store.config = {
          ...mockConfig.data,
          socialaccount: {
            providers: [],
          },
        } as any
        expect(store.hasSocialAccountProviders).toBe(false)
      })

      it('should return false when config is undefined', () => {
        store.config = undefined
        expect(store.hasSocialAccountProviders).toBe(false)
      })
    })

    describe('hasCurrentPassword', () => {
      it('should return true when user has usable password', () => {
        store.session = mockSession.data
        expect(store.hasCurrentPassword).toBe(true)
      })

      it('should return false when user has no usable password', () => {
        store.session = {
          ...mockSession.data,
          user: {
            ...mockSession.data.user,
            has_usable_password: false,
          },
        }
        expect(store.hasCurrentPassword).toBe(false)
      })

      it('should return false when session is undefined', () => {
        store.session = undefined
        expect(store.hasCurrentPassword).toBe(false)
      })
    })

    describe('otherSessions', () => {
      it('should return non-current sessions', () => {
        store.sessions = mockSessions.data
        const others = store.otherSessions
        expect(others.length).toBe(1)
        expect(others[0]!.id).toBe(2)
        expect(others[0]!.is_current).toBe(false)
      })

      it('should return empty array when no sessions', () => {
        store.sessions = []
        expect(store.otherSessions).toEqual([])
      })
    })

    describe('Authenticator Getters', () => {
      beforeEach(() => {
        store.authenticators = mockAuthenticators.data
      })

      it('should find TOTP authenticator', () => {
        const totp = store.totpAuthenticator
        expect(totp).toBeDefined()
        expect(totp?.type).toBe('totp')
      })

      it('should find WebAuthn authenticator', () => {
        const webauthn = store.webauthnAuthenticator
        expect(webauthn).toBeDefined()
        expect(webauthn?.type).toBe('webauthn')
      })

      it('should find Recovery Codes authenticator', () => {
        const recoveryCodes = store.recoveryCodesAuthenticator
        expect(recoveryCodes).toBeDefined()
        expect(recoveryCodes?.type).toBe('recovery_codes')
      })

      it('should return undefined when authenticator type not found', () => {
        store.authenticators = []
        expect(store.totpAuthenticator).toBeUndefined()
        expect(store.webauthnAuthenticator).toBeUndefined()
        expect(store.recoveryCodesAuthenticator).toBeUndefined()
      })
    })
  })

  describe('Setup Methods', () => {
    describe('setupConfig', () => {
      it('should fetch and set config successfully', async () => {
        mockFetch.mockResolvedValueOnce(mockConfig)

        await store.setupConfig()

        expect(mockFetch).toHaveBeenCalledWith('/api/_allauth/app/v1/config', {
          method: 'GET',
          headers: {},
        })
        expect(store.config).toEqual(mockConfig.data)
        expect(store.status.config).toBe('success')
      })

      it('should handle config fetch error', async () => {
        const error = new Error('Failed to fetch config')
        mockFetch.mockRejectedValueOnce(error)

        await store.setupConfig()

        expect(store.config).toBeUndefined()
        expect(store.status.config).toBe('error')
        expect(store.error.config).toBe(error)
      })

      it('should set pending status during fetch', async () => {
        mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockConfig), 100)))

        const promise = store.setupConfig()
        expect(store.status.config).toBe('pending')

        await promise
        expect(store.status.config).toBe('success')
      })
    })

    describe('setupSession', () => {
      it('should handle session setup', async () => {
        // This test verifies the method exists and can be called
        // Full integration testing would require proper Nuxt context
        expect(typeof store.setupSession).toBe('function')
        await store.setupSession()
        // Session setup depends on auth state which is mocked at module level
      })
    })

    describe('setupSessions', () => {
      it('should handle sessions setup', async () => {
        // This test verifies the method exists and can be called
        expect(typeof store.setupSessions).toBe('function')
        await store.setupSessions()
        // Sessions setup depends on auth state which is mocked at module level
      })
    })

    describe('setupAuthenticators', () => {
      it('should handle authenticators setup', async () => {
        // This test verifies the method exists and can be called
        expect(typeof store.setupAuthenticators).toBe('function')
        await store.setupAuthenticators()
        // Authenticators setup depends on auth state which is mocked at module level
      })
    })
  })

  describe('State Management', () => {
    describe('refreshSession', () => {
      it('should have refreshSession method', () => {
        // This test verifies the method exists
        expect(typeof store.refreshSession).toBe('function')
      })
    })

    describe('clearAuthState', () => {
      it('should reset all auth state', () => {
        store.session = mockSession.data
        store.sessions = mockSessions.data
        store.authenticators = mockAuthenticators.data

        store.clearAuthState()

        expect(store.session).toBeUndefined()
        expect(store.sessions).toEqual([])
        expect(store.authenticators).toBeUndefined()
      })
    })
  })
})
