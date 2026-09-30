import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import setupPlugin from '~/plugins/setup'
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'
import { useUserStore } from '~/stores/user'
import { useUserNotificationStore } from '~/stores/user-notification'

/**
 * The client half of the session bootstrap.
 *
 * A normal page loads the allauth config and the session, then the
 * account and the cart, then — after hydration — the sessions list,
 * authenticators and notifications. A page hydrating markup that was
 * cached for EVERYONE (`payload.isCached`, prerendered) must not load
 * anything visitor-specific before hydration, or the client tree stops
 * matching the anonymous HTML: only the config and a guest's
 * cookie-bound cart are restored, once suspense resolves, and signing
 * in restores the rest through the `loggedIn` watcher.
 *
 * The server half — a cached render never fetching the triggering
 * visitor's session or cart — is asserted end to end in
 * test/e2e/pageRenders.ts: `import.meta.server` is false in
 * this environment.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { session, syncFromUser } = vi.hoisted(() => ({
  session: { loggedIn: undefined as undefined | Ref<boolean> },
  syncFromUser: vi.fn(() => Promise.resolve()),
}))
mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  return {
    loggedIn: session.loggedIn,
    user: ref(null),
    session: ref({}),
    ready: ref(true),
    fetch: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  }
})
mockNuxtImport('useUserLanguage', () => () => ({ syncFromUser }))

type Hook = () => Promise<void>

/** Run the plugin against a stand-in app with `payload`; returns its hooks. */
async function run(payload: Record<string, unknown>) {
  const hooks: Record<string, Hook> = {}
  const app = {
    payload,
    hook: (name: string, handler: Hook) => { hooks[name] = handler },
  }
  await (setupPlugin as unknown as (app: unknown) => Promise<void>)(app)
  await flushPromises()
  return hooks
}

function spyStores() {
  const auth = useAuthStore()
  const user = useUserStore()
  const cart = useCartStore()
  const notifications = useUserNotificationStore()
  return {
    setupConfig: vi.spyOn(auth, 'setupConfig').mockResolvedValue(undefined as never),
    setupSession: vi.spyOn(auth, 'setupSession').mockResolvedValue(undefined as never),
    setupSessions: vi.spyOn(auth, 'setupSessions').mockResolvedValue(undefined as never),
    setupAuthenticators: vi.spyOn(auth, 'setupAuthenticators').mockResolvedValue(undefined as never),
    setupAccount: vi.spyOn(user, 'setupAccount').mockResolvedValue(undefined as never),
    setupCart: vi.spyOn(cart, 'setupCart').mockResolvedValue(undefined as never),
    cleanCartState: vi.spyOn(cart, 'cleanCartState').mockResolvedValue(undefined as never),
    setupNotifications: vi.spyOn(notifications, 'setupNotifications').mockResolvedValue(undefined as never),
  }
}

function cartSetting(value: string | undefined) {
  api.routes({ '/api/settings/public': { settings: value === undefined ? {} : { CART_ENABLED: value } } })
}

const FRESH = { serverRendered: true }
const CACHED = { serverRendered: true, isCached: true }
const PRERENDERED = { serverRendered: true, prerenderedAt: 1767225600000 }

describe('setup plugin', () => {
  let stores: ReturnType<typeof spyStores>

  beforeEach(() => {
    clearNuxtData()
    session.loggedIn = ref(false)
    stores = spyStores()
    cartSetting(undefined)
  })

  describe('on a freshly rendered page', () => {
    it('loads the config, session, account and cart, then the rest after hydration', async () => {
      await run(FRESH)

      for (const action of ['setupConfig', 'setupSession', 'setupAccount', 'setupCart'] as const) {
        expect(stores[action], action).toHaveBeenCalledTimes(1)
      }
      await vi.waitFor(() => {
        for (const action of ['setupSessions', 'setupAuthenticators', 'setupNotifications'] as const) {
          expect(stores[action], action).toHaveBeenCalledTimes(1)
        }
      })
      expect(syncFromUser).toHaveBeenCalledTimes(1)
    })

    it('loads the config and session before the account and cart', async () => {
      await run(FRESH)

      const last = Math.max(...stores.setupConfig.mock.invocationCallOrder, ...stores.setupSession.mock.invocationCallOrder)
      expect(stores.setupAccount.mock.invocationCallOrder[0]).toBeGreaterThan(last)
      expect(stores.setupCart.mock.invocationCallOrder[0]).toBeGreaterThan(last)
    })

    it('skips the cart on a store that has it switched off', async () => {
      cartSetting('False')

      await run(FRESH)

      expect(stores.setupCart).not.toHaveBeenCalled()
      expect(stores.setupAccount).toHaveBeenCalledTimes(1)
    })

    // All three calls start eagerly either way; what `allSettled` buys is
    // that the failure is handled. Under `Promise.all` the rejection goes
    // unhandled, which vitest reports as an error and fails the run.
    it('still loads the rest when one deferred call fails', async () => {
      stores.setupSessions.mockRejectedValue(new Error('401'))

      await run(FRESH)

      await vi.waitFor(() => {
        expect(stores.setupAuthenticators).toHaveBeenCalledTimes(1)
        expect(stores.setupNotifications).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe.each([
    ['cached for every visitor', CACHED],
    ['prerendered', PRERENDERED],
  ])('on a page %s', (_case, payload) => {
    it('loads nothing visitor-specific before hydration', async () => {
      await run(payload)

      for (const action of Object.keys(stores) as Array<keyof typeof stores>) {
        expect(stores[action], action).not.toHaveBeenCalled()
      }
    })

    it('restores only the config and a guest\'s cart once hydrated', async () => {
      const hooks = await run(payload)

      await hooks['app:suspense:resolve']!()

      expect(stores.setupConfig).toHaveBeenCalledTimes(1)
      expect(stores.setupCart).toHaveBeenCalledTimes(1)
      for (const action of ['setupSession', 'setupAccount', 'setupSessions', 'setupAuthenticators', 'setupNotifications'] as const) {
        expect(stores[action], action).not.toHaveBeenCalled()
      }
    })

    it('leaves a signed-in visitor\'s cart to the sign-in watcher', async () => {
      session.loggedIn = ref(true)
      const hooks = await run(payload)

      await hooks['app:suspense:resolve']!()

      expect(stores.setupConfig).toHaveBeenCalledTimes(1)
      expect(stores.setupCart).not.toHaveBeenCalled()
    })

    it('restores no cart on a store that has it switched off', async () => {
      cartSetting('False')
      const hooks = await run(payload)

      await hooks['app:suspense:resolve']!()

      expect(stores.setupCart).not.toHaveBeenCalled()
    })
  })

  describe('when the visitor signs in or out later', () => {
    it('restores the session, account and cart on sign-in, even if one account call fails', async () => {
      await run(CACHED)
      stores.setupAccount.mockRejectedValue(new Error('500'))

      session.loggedIn!.value = true
      await nextTick()
      await flushPromises()

      for (const action of ['setupSession', 'setupSessions', 'setupAuthenticators', 'setupNotifications', 'setupCart'] as const) {
        expect(stores[action], action).toHaveBeenCalledTimes(1)
      }
      expect(syncFromUser).toHaveBeenCalledTimes(1)
    })

    it('clears the cart on sign-out', async () => {
      session.loggedIn = ref(true)
      await run(FRESH)

      session.loggedIn.value = false
      await nextTick()
      await flushPromises()

      expect(stores.cleanCartState).toHaveBeenCalledTimes(1)
    })
  })
})
