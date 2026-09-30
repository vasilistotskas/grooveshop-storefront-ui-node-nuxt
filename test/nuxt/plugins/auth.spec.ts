import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import authPlugin from '~/plugins/auth'

/**
 * The auth plugin turns every allauth response into ONE navigation:
 * signed in → the page the visitor came for (`?next=`, only if it is a
 * path on this site) or the account; signed out → home, with a toast
 * only when the server ended the session (an explicit logout is
 * silent); reauthentication → the flow page with the current page as
 * `next`.
 *
 * The event rule (`determineAuthChangeEvent`) and the path check
 * (`isSafeRelativePath`) are unit-tested on their own; this is the
 * wiring. Each test installs a FRESH copy of the plugin on a stand-in
 * app, so the previous auth state it remembers starts empty.
 */
const { navigateToMock, fetchSession, clearSession, toastAdd } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  fetchSession: vi.fn(() => Promise.resolve()),
  clearSession: vi.fn(() => Promise.resolve()),
  toastAdd: vi.fn(),
}))

mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: fetchSession,
  clear: clearSession,
}))
mockNuxtImport('useToast', () => () => ({ add: toastAdd, remove: vi.fn(), update: vi.fn(), clear: vi.fn(), toasts: ref([]) }))

// `visit()` navigates for real, and vue-router loads a lazy page component
// before it resolves the navigation — so the first visit to the account
// settings page transformed that page's whole component graph, which under
// the full parallel run outlasted the 5s test budget. These tests read only
// the route, so the pages they pass through are empty components.
const { PageStub } = await vi.hoisted(async () => {
  const { defineComponent } = await import('vue')
  return { PageStub: defineComponent({ render: () => null }) }
})
vi.mock('~/pages/index.vue', () => ({ default: PageStub }))
vi.mock('~/pages/account/login/index.vue', () => ({ default: PageStub }))
vi.mock('~/pages/account/reauthenticate.vue', () => ({ default: PageStub }))
vi.mock('~/pages/account/settings/index.vue', () => ({ default: PageStub }))

type AuthChange = (detail: unknown, explicit?: boolean) => Promise<void>

/** Install the plugin on a stand-in app and return its `auth:change` handler. */
async function install(): Promise<AuthChange> {
  const hooks: Record<string, (payload: unknown) => Promise<void>> = {}
  const app = {
    hook: (name: string, handler: (payload: unknown) => Promise<void>) => { hooks[name] = handler },
    provide: vi.fn(),
    runWithContext: (fn: () => unknown) => fn(),
    $i18n: useNuxtApp().$i18n,
  }
  await (authPlugin as unknown as (app: unknown) => Promise<void>)(app)
  return (detail, explicit) => hooks['auth:change']!({ detail, explicit })
}

const SIGNED_IN = {
  status: 200,
  data: { user: { id: 1, email: 'maria@example.com' }, methods: [{ method: 'password', at: 1 }], flows: [] },
  meta: { is_authenticated: true, session_token: 'st' },
}
const SIGNED_OUT = { status: 401, data: { flows: [{ id: 'login' }] }, meta: { is_authenticated: false } }
const SESSION_GONE = { status: 410, data: { flows: [] }, meta: { is_authenticated: false } }
const REAUTH_REQUIRED = {
  status: 401,
  data: { flows: [{ id: 'reauthenticate' }] },
  meta: { is_authenticated: true },
}

/** The path (and query) the plugin navigated to, the one time it did. */
function navigatedTo() {
  expect(navigateToMock).toHaveBeenCalledTimes(1)
  const [target] = navigateToMock.mock.calls[0]!
  return { path: target.path, query: target.query }
}

async function visit(path: string) {
  await useRouter().replace(path)
}

describe('auth plugin', () => {
  beforeEach(async () => {
    useState('auth-state').value = undefined
    useState('auth:userInitiatedLogout').value = false
    await visit('/')
  })

  describe('on sign-in', () => {
    it.each([
      ['/account/orders?tab=2', '/account/orders?tab=2'],
      ['/cart', '/cart'],
    ])('returns the visitor to next=%s', async (next, expected) => {
      const change = await install()
      await visit(`/account/login?next=${encodeURIComponent(next)}`)

      await change(SIGNED_IN)

      expect(navigatedTo().path).toBe(expected)
    })

    it.each([
      ['https://evil.example/phish'],
      ['//evil.example/phish'],
      ['/\\evil.example'],
      ['javascript:alert(1)'],
      ['account/orders'],
      // Back to the login page would be a loop.
      ['/account/login'],
    ])('ignores next=%s and goes to the account', async (next) => {
      const change = await install()
      await visit(`/account/login?next=${encodeURIComponent(next)}`)

      await change(SIGNED_IN)

      expect(navigatedTo().path).toBe('/account')
    })

    it('goes to the account without a next', async () => {
      const change = await install()
      await visit('/account/login')

      await change(SIGNED_IN)

      expect(navigatedTo().path).toBe('/account')
    })

    it('syncs the session before navigating, so the route guard sees the visitor signed in', async () => {
      const change = await install()

      await change(SIGNED_IN)

      expect(fetchSession).toHaveBeenCalledTimes(1)
      expect(fetchSession.mock.invocationCallOrder[0]).toBeLessThan(navigateToMock.mock.invocationCallOrder[0]!)
    })

    it('does nothing when the same signed-in state arrives again', async () => {
      const change = await install()
      await change(SIGNED_IN)
      navigateToMock.mockClear()

      await change(SIGNED_IN)

      expect(navigateToMock).not.toHaveBeenCalled()
    })
  })

  describe('on sign-out', () => {
    it('clears the session and goes home, silently, when the visitor logged out', async () => {
      const change = await install()
      await change(SIGNED_IN)
      navigateToMock.mockClear()

      await change(SESSION_GONE, true)

      expect(clearSession).toHaveBeenCalledTimes(1)
      expect(navigatedTo().path).toBe('/')
      expect(toastAdd).not.toHaveBeenCalled()
    })

    it('tells the visitor when the server ended the session', async () => {
      const change = await install()
      await change(SIGNED_IN)
      navigateToMock.mockClear()

      await change(SESSION_GONE)

      expect(navigatedTo().path).toBe('/')
      expect(toastAdd).toHaveBeenCalledTimes(1)
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: useNuxtApp().$i18n.t('auth.session_expired_title'),
        color: 'warning',
      }))
    })

    it('forgets an explicit logout once it has been handled', async () => {
      const change = await install()
      await change(SIGNED_IN)
      await change(SESSION_GONE, true)
      await change(SIGNED_IN)
      toastAdd.mockClear()

      await change(SESSION_GONE)

      expect(toastAdd).toHaveBeenCalledTimes(1)
    })

    it('treats a guest\'s own 401 as signed out, not as a flow to follow', async () => {
      const change = await install()

      await change(SIGNED_OUT)

      expect(navigatedTo().path).toBe('/')
    })
  })

  describe('on reauthentication', () => {
    it('sends the visitor to the reauthentication flow with the current page as next', async () => {
      const change = await install()
      await change(SIGNED_IN)
      await visit('/account/settings?section=email')
      navigateToMock.mockClear()

      await change(REAUTH_REQUIRED)

      expect(navigatedTo()).toEqual({
        path: '/account/reauthenticate',
        query: { next: '/account/settings?section=email' },
      })
    })

    it.each([
      ['/account/settings', '/account/settings'],
      ['https://evil.example', '/account'],
    ])('returns to next=%s → %s once reauthenticated', async (next, expected) => {
      const change = await install()
      await change(SIGNED_IN)
      await change(REAUTH_REQUIRED)
      await visit(`/account/reauthenticate?next=${encodeURIComponent(next)}`)
      navigateToMock.mockClear()

      await change(SIGNED_IN)

      expect(navigatedTo().path).toBe(expected)
    })
  })
})
