import type { IFetchError } from 'ofetch'
import type { ConfigResponse, SessionResponse } from '~/types/all-auth'
import type { NuxtError } from '#app'
import type { AsyncDataRequestStatus } from '#app/composables/asyncData'

interface ErrorRecord {
  config: NuxtError | IFetchError | null | undefined
}

interface StatusRecord {
  config: AsyncDataRequestStatus
}

const errorsFactory = (): ErrorRecord => ({
  config: null,
})

const statusFactory = (): StatusRecord => ({
  config: 'idle',
})

export const useAuthStore = defineStore('auth', () => {
  const session = ref<SessionResponse>()
  const config = ref<ConfigResponse>()
  const status = ref<StatusRecord>(statusFactory())
  const error = ref<ErrorRecord>(errorsFactory())

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
    const { loggedIn, clear } = useUserSession()
    if (!loggedIn.value) {
      return
    }
    console.log('Setting up session...')
    const { getSession } = useAllAuthAuthentication()
    const { data, error } = await useAsyncData(
      'session',
      () => getSession(),
    )
    console.log('Session data:', data.value)
    if (error.value) {
      await clear()
    }
    if (data.value) {
      session.value = data.value
    }
  }

  const refreshSession = async (encrypted_token: string | null = null) => {
    console.log('Refreshing session...')
    const { getSession } = useAllAuthAuthentication()
    const data = await getSession(encrypted_token)
    if (data) {
      session.value = data
    }
  }

  const clearSession = () => {
    session.value = undefined
  }

  const setupConfig = async () => {
    const publicConfig = useRuntimeConfig().public
    status.value.config = 'pending'
    await useFetch(
      `${publicConfig.djangoUrl}/_allauth/browser/v1/config`,
      {
        method: 'GET',
        credentials: 'include',
        server: false,
        onResponse({ response }) {
          if (!response.ok) {
            return
          }
          config.value = response._data
          status.value.config = 'success'
        },
        onResponseError(context) {
          config.value = undefined
          status.value.config = 'error'
          error.value.config = context.error
        },
      },
    )
  }

  return {
    session,
    config,
    status,
    error,
    hasProviders,
    hasCurrentPassword,
    setupSession,
    refreshSession,
    clearSession,
    setupConfig,
  }
})
