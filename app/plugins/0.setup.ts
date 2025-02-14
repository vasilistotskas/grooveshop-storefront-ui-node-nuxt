export default defineNuxtPlugin({
  name: 'setup',
  parallel: true,
  async setup() {
    const authStore = useAuthStore()
    const { setupConfig, setupSession } = authStore

    await setupConfig()
    await setupSession()
  },
})
