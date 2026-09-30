import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { makeAllAuthConfig, makeSessionResponse } from '~~/test/fixtures/allauth'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
/**
 * Plain `{ value }` holders, not refs: the setup plugin watches
 * `loggedIn`, and a reactive one would start its own session, account,
 * cart and language chain against these mocks whenever a test signs in.
 * That watcher is inert here on purpose: the plugin's sign-in chain is
 * not what these specs test.
 */
const { session, allauth } = vi.hoisted(() => ({
  session: {
    loggedIn: { value: false },
    user: { value: null },
    clear: vi.fn(() => Promise.resolve()),
    fetch: vi.fn(() => Promise.resolve()),
  },
  allauth: {
    getSession: vi.fn((_token?: string | null) => Promise.resolve<unknown>(undefined)),
    getSessions: vi.fn(() => Promise.resolve<unknown>(undefined)),
    getAuthenticators: vi.fn(() => Promise.resolve<unknown>(undefined)),
  },
}))

mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useUserSession', () => () => session)
mockNuxtImport('useAllAuthAuthentication', () => () => ({ getSession: allauth.getSession }))
mockNuxtImport('useAllAuthSessions', () => () => ({ getSessions: allauth.getSessions }))
mockNuxtImport('useAllAuthAccount', () => () => ({ getAuthenticators: allauth.getAuthenticators }))

const CONFIG = makeAllAuthConfig({
  mfa: { supported_types: ['totp', 'webauthn', 'recovery_codes'] },
  usersessions: { track_activity: true },
})

const SESSION = makeSessionResponse({ user: { id: 1 } })

const SESSIONS: SessionsGetResponse = {
  status: 200,
  data: [
    { id: 1, is_current: true, user_agent: 'Firefox', ip: '10.0.0.1', created_at: 1_700_000_000 },
    { id: 2, is_current: false, user_agent: 'Safari', ip: '10.0.0.2', created_at: 1_700_000_000 },
  ],
}

const AUTHENTICATORS: AuthenticatorsResponse = {
  status: 200,
  data: [
    { id: 1, type: 'totp', created_at: 1_700_000_000, last_used_at: null },
    { id: 2, type: 'webauthn', created_at: 1_700_000_000, last_used_at: null },
    { id: 3, type: 'recovery_codes', created_at: 1_700_000_000, last_used_at: null },
  ],
}

describe('useAuthStore', () => {
  let store: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAuthStore()
    session.loggedIn.value = false
  })

  it('starts with no config, session, sessions or authenticators, and an idle config request', () => {
    expect({
      config: store.config,
      session: store.session,
      sessions: store.sessions,
      authenticators: store.authenticators,
      status: store.status,
      error: store.error,
    }).toEqual({
      config: undefined,
      session: undefined,
      sessions: [],
      authenticators: undefined,
      status: { config: 'idle' },
      error: { config: null },
    })
  })

  describe('getters', () => {
    it.each([
      ['a listed provider', CONFIG.data, true],
      ['an empty provider list', { ...CONFIG.data, socialaccount: { providers: [] } }, false],
      ['no config', undefined, false],
    ])('hasSocialAccountProviders is %s → %s', (_case, config, expected) => {
      store.config = config
      expect(store.hasSocialAccountProviders).toBe(expected)
    })

    it.each([
      ['a usable password', SESSION.data, true],
      ['no usable password', { ...SESSION.data, user: { ...SESSION.data.user, has_usable_password: false } }, false],
      ['no session', undefined, false],
    ])('hasCurrentPassword with %s → %s', (_case, session, expected) => {
      store.session = session
      expect(store.hasCurrentPassword).toBe(expected)
    })

    it('otherSessions leaves out the current session', () => {
      store.sessions = SESSIONS.data
      expect(store.otherSessions.map(s => s.id)).toEqual([2])
    })

    it('finds each authenticator by its type', () => {
      store.authenticators = [...AUTHENTICATORS.data].reverse()

      expect(store.totpAuthenticator?.id).toBe(1)
      expect(store.webauthnAuthenticator?.id).toBe(2)
      expect(store.recoveryCodesAuthenticator?.id).toBe(3)
    })

    it('has no authenticator of a type the user has not set up', () => {
      store.authenticators = []

      expect(store.totpAuthenticator).toBeUndefined()
      expect(store.webauthnAuthenticator).toBeUndefined()
      expect(store.recoveryCodesAuthenticator).toBeUndefined()
    })
  })

  describe('setupConfig', () => {
    it('fetches the allauth config and marks it loaded', async () => {
      api.routes({ '/api/_allauth/app/v1/config': CONFIG })

      await store.setupConfig()

      expect(api.callsTo('/api/_allauth/app/v1/config')).toEqual([
        { url: '/api/_allauth/app/v1/config', options: expect.objectContaining({ method: 'GET' }) },
      ])
      expect(store.config).toEqual(CONFIG.data)
      expect(store.status.config).toBe('success')
    })

    it('is pending while the request is in flight', async () => {
      let answer!: (value: ConfigResponse) => void
      api.routes({
        '/api/_allauth/app/v1/config': () => new Promise((resolve) => {
          answer = resolve
        }),
      })

      const setup = store.setupConfig()
      expect(store.status.config).toBe('pending')

      answer(CONFIG)
      await setup
      expect(store.status.config).toBe('success')
    })

    it('records a failed request and drops any previous config', async () => {
      store.config = CONFIG.data
      api.routes({
        '/api/_allauth/app/v1/config': () => {
          throw new Error('Failed to fetch config')
        },
      })

      await store.setupConfig()

      expect(store.config).toBeUndefined()
      expect(store.status.config).toBe('error')
      expect(store.error.config).toEqual(expect.objectContaining({ message: 'Failed to fetch config' }))
    })
  })

  describe.each([
    {
      action: 'setupSession' as const,
      fetcher: allauth.getSession,
      response: SESSION,
      stored: (s: ReturnType<typeof useAuthStore>) => s.session,
      initial: undefined,
    },
    {
      action: 'setupSessions' as const,
      fetcher: allauth.getSessions,
      response: SESSIONS,
      stored: (s: ReturnType<typeof useAuthStore>) => s.sessions,
      initial: [],
    },
    {
      action: 'setupAuthenticators' as const,
      fetcher: allauth.getAuthenticators,
      response: AUTHENTICATORS,
      stored: (s: ReturnType<typeof useAuthStore>) => s.authenticators,
      initial: undefined,
    },
  ])('$action', ({ action, fetcher, response, stored, initial }) => {
    it('does not call allauth for a signed-out visitor', async () => {
      await store[action]()

      expect(fetcher).not.toHaveBeenCalled()
      expect(stored(store)).toEqual(initial)
    })

    it('stores what allauth answers for a signed-in user', async () => {
      session.loggedIn.value = true
      fetcher.mockResolvedValueOnce(response)

      await store[action]()

      expect(stored(store)).toEqual(response.data)
    })

    it('keeps the previous value when allauth answers nothing', async () => {
      session.loggedIn.value = true
      fetcher.mockResolvedValueOnce(response).mockResolvedValueOnce(undefined)

      await store[action]()
      await store[action]()

      expect(stored(store)).toEqual(response.data)
    })

    /**
     * A 401/410 from allauth already fires `auth:change`, which routes
     * through `handleLoggedOut` → `clear()`. A second `clear()` here would
     * fire the setup plugin's `loggedIn` watcher twice and clean the cart
     * twice (the comment in `setupSession`).
     */
    it('swallows a failure without clearing the user session itself', async () => {
      session.loggedIn.value = true
      fetcher.mockRejectedValueOnce(new Error('410 Gone'))

      await expect(store[action]()).resolves.toBeUndefined()

      expect(session.clear).not.toHaveBeenCalled()
      expect(stored(store)).toEqual(initial)
    })
  })

  describe('refreshSession', () => {
    it('forwards the encrypted token and stores the session it gets back', async () => {
      allauth.getSession.mockResolvedValueOnce(SESSION)

      await store.refreshSession('encrypted-token')

      expect(allauth.getSession).toHaveBeenCalledWith('encrypted-token')
      expect(store.session).toEqual(SESSION.data)
    })

    it('asks without a token by default', async () => {
      await store.refreshSession()

      expect(allauth.getSession).toHaveBeenCalledWith(null)
    })

    it('keeps the current session when allauth answers nothing', async () => {
      store.session = SESSION.data
      allauth.getSession.mockResolvedValueOnce(undefined)

      await store.refreshSession('encrypted-token')

      expect(store.session).toEqual(SESSION.data)
    })
  })

  it('clearAuthState forgets the session, sessions and authenticators but keeps the config', () => {
    store.config = CONFIG.data
    store.session = SESSION.data
    store.sessions = SESSIONS.data
    store.authenticators = AUTHENTICATORS.data

    store.clearAuthState()

    expect(store.session).toBeUndefined()
    expect(store.sessions).toEqual([])
    expect(store.authenticators).toBeUndefined()
    expect(store.config).toEqual(CONFIG.data)
  })
})
