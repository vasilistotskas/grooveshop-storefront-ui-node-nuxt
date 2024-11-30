export const useAppStore = defineStore('app', () => {
  const healthy = ref<boolean>(true)

  const healthCheck = async () => {
    const { data, status: healthStatus, error: healthError } = await useFetch<ConfigResponse>(
      '/api/health',
      {
        method: 'GET',
        headers: useRequestHeaders(),
        timeout: 15,
        retry: import.meta.dev ? 0 : 3,
        retryDelay: import.meta.dev ? 0 : 60,
      },
    )

    switch (healthStatus.value) {
      case 'idle':
        healthy.value = true
        break
      case 'pending':
        healthy.value = true
        break
      case 'success':
        healthy.value = true
        break
      case 'error':
        healthy.value = false
        break
    }

    return { data, status: healthStatus, error: healthError }
  }

  return {
    healthy,
    healthCheck,
  }
})
