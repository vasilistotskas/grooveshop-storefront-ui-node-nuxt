export default defineNuxtPlugin({
  name: 'setup',
  parallel: true,
  dependsOn: ['auth'],
  async setup() {
    const { enabled } = useAuthPreviewMode()

    if (enabled.value) {
      const appStore = useAppStore()
      const { healthCheck } = appStore
      const { status } = await healthCheck()

      if (status.value === 'error') {
        return
      }
    }

    const { loggedIn } = useUserSession()
    const authStore = useAuthStore()
    const { setupConfig, setupSession, setupSessions, setupAuthenticators } = authStore
    const userNotificationStore = useUserNotificationStore()
    const { setupNotifications } = userNotificationStore

    await setupConfig()
    await setupSession()

    await Promise.all([
      setupSessions(),
      setupAuthenticators(),
      setupNotifications(),
    ])

    watch(loggedIn, async (value) => {
      if (value) {
        await setupSession()

        await Promise.all([
          setupSessions(),
          setupAuthenticators(),
          setupNotifications(),
        ])
      }
    })
  },
})
