export default defineNuxtPlugin({
  name: 'setup',
  async setup() {
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
  },
})
