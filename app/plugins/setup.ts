export default defineNuxtPlugin({
  name: 'setup',
  parallel: true,
  dependsOn: ['auth'],
  async setup() {
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
      // browser, different device, cookie cleared).
      await syncLanguageFromUser()

      // Defer non-critical data to client-side only (not needed for initial render)
      // Sessions list, authenticators, notifications can load after hydration
      if (import.meta.client) {
        const scheduleIdle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1))
        scheduleIdle(() => {
          Promise.all([
            setupSessions(),
            setupAuthenticators(),
            setupNotifications(),
          ]).catch(err => log.error({ action: 'setup:deferred', error: err }))
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
