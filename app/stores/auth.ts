import type { ConfigResponse, SessionResponse } from '~/types/all-auth'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<SessionResponse>()
  const config = ref<ConfigResponse>()

  const hasProviders = computed(() => {
    if (!config?.value || !config.value?.data || !config.value?.data?.socialaccount) {
      return false
    }
    return config.value?.data?.socialaccount?.providers?.length > 0
  })

  const hasCurrentPassword = computed(() => {
    if (!session.value || !session.value.data || !session.value.data.user) {
      return false
    }
    return session.value.data.user.has_usable_password
  })

  const setupSession = async () => {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) {
      return
    }
    const { getSession } = useAllAuthAuthentication()
    await callOnce(async () => {
      const { data } = await useAsyncData(
        'session',
        () => getSession(),
      )
      if (data.value) {
        session.value = data.value
      }
    })
  }

  const refreshSession = async () => {
    const { getSession } = useAllAuthAuthentication()
    const data = await getSession()
    if (data) {
      session.value = data
    }
  }

  const clearSession = () => {
    session.value = undefined
  }

  const setupConfig = async () => {
    const { getConfig } = useAllAuthConfig()
    await callOnce(async () => {
      const { data } = await useAsyncData(
        'config',
        () => getConfig(),
      )
      if (data.value) {
        config.value = data.value
      }
    })
  }

  return {
    session,
    config,
    hasProviders,
    hasCurrentPassword,
    setupSession,
    refreshSession,
    clearSession,
    setupConfig,
  }
})
