export default defineNuxtPlugin({
  name: 'setup',
  parallel: true,
  dependsOn: ['auth'],
  async setup() {
    // Skip API calls during build-time prerendering (no backend available)
    if (import.meta.server && useRequestHeaders()['x-nitro-prerender']) {
      return
    }

    const { loggedIn } = useUserSession()
    const userStore = useUserStore()
    const { setupAccount } = userStore
    const cartStore = useCartStore()
    const { setupCart, cleanCartState } = cartStore
    const authStore = useAuthStore()
    const { setupConfig, setupSession, setupSessions, setupAuthenticators } = authStore
    const userNotificationStore = useUserNotificationStore()
    const { setupNotifications } = userNotificationStore
    const { syncFromUser: syncLanguageFromUser } = useUserLanguage()

    try {
      // Critical for SSR: config and session in parallel (both needed for initial render)
      await Promise.all([
        setupConfig(),
        setupSession(),
      ])

      // Cart and account needed for header UI during SSR
      await Promise.all([
        setupAccount(),
        setupCart(),
      ])

      // Backend is the source of truth for the user's language. Reconcile
      // the UI locale with `user.languageCode` so the switcher and every
      // rendered email agree, even if the i18n cookie disagreed (fresh
      // browser, different device, cookie cleared). Deferred to the client
      // so prerender / anonymous SSR — where `loggedIn` is always false and
      // calling setLocale() on a not-fully-wired i18n instance could
      // explode — never runs it.
      if (import.meta.client) {
        await syncLanguageFromUser()
      }

      // Defer non-critical data to client-side only (not needed for initial render)
      // Sessions list, authenticators, notifications can load after hydration.
      //
      // ``Promise.allSettled`` (not ``Promise.all``) so one failing
      // call — e.g. an expired session token causing ``setupSessions``
      // to 401 — doesn't cancel the other two. Before this change a
      // single bad call silently left the notification bell empty even
      // though the /user/account/{id}/notifications endpoint returned
      // data fine.
      if (import.meta.client) {
        const scheduleIdle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1))
        scheduleIdle(() => {
          Promise.allSettled([
            setupSessions(),
            setupAuthenticators(),
            setupNotifications(),
          ]).then((results) => {
            results.forEach((r, i) => {
              if (r.status === 'rejected') {
                const name = ['setupSessions', 'setupAuthenticators', 'setupNotifications'][i]
                log.warn('setup', `deferred ${name} failed`, { error: r.reason })
              }
            })
          })
        }, { timeout: 2000 })
      }
    }
    catch (error) {
      log.error({ action: 'setup:failed', error })
    }

    watch(loggedIn, async (value, oldValue) => {
      if (value === oldValue) return
      if (value) {
        await setupSession()

        await Promise.all([
          setupAccount(),
          setupSessions(),
          setupAuthenticators(),
          setupNotifications(),
        ])
        await setupCart()
        await syncLanguageFromUser()
      }
      else {
        await cleanCartState()
      }
    }, { immediate: false })
  },
})
