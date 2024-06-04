import type { ConfigResponse, SessionResponse, TotpGetResponse } from '~/types/all-auth'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<SessionResponse>()
  const config = ref<ConfigResponse>()
  const totpData = ref<TotpGetResponse>()
  const totpSecret = ref('')
  const totpSvg = ref('')

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

  const getTotpAuthenticatorStatus = async () => {
    if (totpSecret.value || totpSvg.value) return

    const { totpAuthenticatorStatus } = useAllAuthAccount()
    const { data, error, refresh } = await totpAuthenticatorStatus()

    if (data.value) {
      totpData.value = data.value
    }

    if (!isAllAuthClientError(error.value)) return
    const secret = error.value?.data.data.meta.secret
    const svg = error.value?.data.data.meta.svg
    totpSecret.value = secret
    totpSvg.value = svg
    return { data, error, refresh }
  }

  return {
    session,
    config,
    hasProviders,
    hasCurrentPassword,
    totpData,
    totpSecret,
    totpSvg,
    setupSession,
    setupConfig,
    getTotpAuthenticatorStatus,
  }
})
