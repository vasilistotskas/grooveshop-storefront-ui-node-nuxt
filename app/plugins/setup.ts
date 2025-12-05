export default defineNuxtPlugin({
  name: 'setup',
  parallel: true,
  dependsOn: ['auth'],
  async setup() {
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
        // Use requestIdleCallback or setTimeout to defer non-critical fetches
        requestIdleCallback(() => {
          Promise.all([
            setupSessions(),
            setupAuthenticators(),
            setupNotifications(),
          ]).catch(err => console.error('Failed to setup deferred data:', err))
        }, { timeout: 2000 })
      }
    }
    catch (error) {
      console.error('Failed during initial setup:', error)
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
