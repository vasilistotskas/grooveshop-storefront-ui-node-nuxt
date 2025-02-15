export default defineNuxtPlugin({
  name: 'setup',
  parallel: true,
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

    const authStore = useAuthStore()
    const { setupConfig, setupSession } = authStore

    await setupConfig()
    await setupSession()
  },
})
