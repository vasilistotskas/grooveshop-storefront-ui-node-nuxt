export const useAppStore = defineStore('app', () => {
  const healthy = ref<boolean>(true)

  const healthCheck = async () => {
    try {
      const data = await $fetch('/api/health', {
        method: 'GET',
        headers: useRequestHeaders(),
        timeout: 15000,
        retry: import.meta.dev ? 0 : 3,
        retryDelay: import.meta.dev ? 0 : 60,
      })
      healthy.value = true
      return { data, error: null }
    }
    catch (error) {
      healthy.value = false
      return { data: null, error }
    }
  }

  return {
    healthy,
    healthCheck,
  }
})
