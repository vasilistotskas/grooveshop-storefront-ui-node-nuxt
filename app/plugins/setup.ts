export default defineNuxtPlugin({
  name: 'setup',
  parallel: true,
  dependsOn: ['auth'],
  async setup() {
    const { loggedIn } = useUserSession()
    const userStore = useUserStore()
    const { setupAccount } = userStore
    const authStore = useAuthStore()
    const { setupConfig, setupSession, setupSessions, setupAuthenticators } = authStore
    const userNotificationStore = useUserNotificationStore()
    const { setupNotifications } = userNotificationStore

    await setupConfig()
    await setupSession()

    await Promise.all([
      setupAccount(),
      setupSessions(),
      setupAuthenticators(),
      setupNotifications(),
    ])

    watch(loggedIn, async (value) => {
      if (value) {
        await setupSession()

        await Promise.all([
          setupAccount(),
          setupSessions(),
          setupAuthenticators(),
          setupNotifications(),
        ])
      }
    })
  },
})
