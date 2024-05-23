import type { ConfigResponse, SessionResponse } from '~/types/all-auth'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<SessionResponse>()
  const config = ref<ConfigResponse>()

  const setupSession = async () => {
    const { getSession } = useAllAuthAuthentication()
    await callOnce(async () => {
      const { data } = await getSession()
      if (data.value) {
        session.value = data.value
      }
    })
  }

  const setupConfig = async () => {
    const { getConfig } = useAllAuthConfig()
    await callOnce(async () => {
      const { data } = await getConfig()
      if (data.value) {
        config.value = data.value
      }
    })
  }

  return {
    session,
    config,
    setupSession,
    setupConfig,
  }
})
