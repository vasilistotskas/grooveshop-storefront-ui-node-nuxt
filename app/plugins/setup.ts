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
      await setupConfig()
      await setupSession()

      await Promise.all([
        setupAccount(),
        setupSessions(),
        setupCart(),
        setupAuthenticators(),
        setupNotifications(),
      ])
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
