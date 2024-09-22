export default defineNuxtPlugin({
  name: 'setup',
  async setup(nuxtApp) {
    const { fetch } = useUserSession()
    const authStore = useAuthStore()
    const { setupConfig, setupSession, setupSessions, setupAuthenticators } = authStore
    const userNotificationStore = useUserNotificationStore()
    const { setupNotifications } = userNotificationStore

    await Promise.all([
      setupConfig(),
      setupSession(),
      setupSessions(),
      setupAuthenticators(),
      setupNotifications(),
    ])

    nuxtApp.hook('auth:change', async ({ detail: newAuthState }) => {
      if (newAuthState.status === 200 && newAuthState.meta?.is_authenticated) {
        await fetch()
        await Promise.all([
          setupSessions(),
          setupAuthenticators(),
          setupNotifications(),
        ])
      }
    })
  },
})
