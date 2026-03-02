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
    const { setupCart } = cartStore
    const authStore = useAuthStore()
    const { setupConfig, setupSession, setupSessions, setupAuthenticators } = authStore
    const userNotificationStore = useUserNotificationStore()
    const { setupNotifications } = userNotificationStore

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
      }
      await setupCart()
    }, { immediate: false })
  },
})
