export default defineNuxtPlugin({
  name: 'setup',
  parallel: true,
  async setup() {
    const appStore = useAppStore()
    const { healthCheck } = appStore
    const { status } = await healthCheck()

    if (status.value === 'error') {
      return
    }

    const authStore = useAuthStore()
    const { setupConfig, setupSession } = authStore

    await Promise.all([
      setupConfig(),
      setupSession(),
    ])
  },
})
