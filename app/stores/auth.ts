import type { IFetchError } from 'ofetch'
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
  const config = ref<ConfigResponse['data']>()
  const session = ref<SessionResponse['data']>()
  const sessions = ref<SessionsGetResponse['data']>([])
  const authenticators = ref<AuthenticatorsResponse['data']>()
  const status = ref<StatusRecord>(statusFactory())
  const error = ref<ErrorRecord>(errorsFactory())

  const hasSocialAccountProviders = computed(() => {
    if (!config?.value || !config.value || !config.value?.socialaccount) {
      return false
    }
    return config.value?.socialaccount?.providers?.length > 0
  })

  const hasCurrentPassword = computed(() => {
    if (!session.value || !session.value || !session.value.user) {
      return false
    }
    return session.value.user.has_usable_password
  })

  const otherSessions = computed(() => {
    return sessions.value?.filter(session => !session.is_current)
  })

  const totpAuthenticator = computed(() => {
    return authenticators.value?.find(authenticator => authenticator.type === AuthenticatorType.TOTP)
  })

  const webauthnAuthenticator = computed(() => {
    return authenticators.value?.find(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN)
  })

  const recoveryCodesAuthenticator = computed(() => {
    return authenticators.value?.find(authenticator => authenticator.type === AuthenticatorType.RECOVERY_CODES)
  })

  const setupConfig = async () => {
    try {
      status.value.config = 'pending'
      const data = await $fetch<ConfigResponse>(
        '/api/_allauth/app/v1/config',
        {
          method: 'GET',
          headers: useRequestHeaders(),
        },
      )
      if (data) {
        config.value = data.data
        status.value.config = 'success'
      }
    }
    catch (err) {
      config.value = undefined
      status.value.config = 'error'
      error.value.config = err as IFetchError
      console.error('Failed to setup config:', err)
    }
  }

  const setupSession = async () => {
    const { loggedIn, clear } = useUserSession()
    if (!loggedIn.value) {
      return
    }

    try {
      const { getSession } = useAllAuthAuthentication()
      const data = await getSession()

      if (data) {
        session.value = data.data
      }
    }
    catch (err) {
      console.error('Failed to setup session:', err)
      await clear()
    }
  }

  const setupSessions = async () => {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) {
      return
    }

    try {
      const { getSessions } = useAllAuthSessions()
      const data = await getSessions()

      if (data) {
        sessions.value = data.data
      }
    }
    catch (err) {
      console.error('Failed to setup sessions:', err)
    }
  }

  const setupAuthenticators = async () => {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) {
      return
    }

    try {
      const { getAuthenticators } = useAllAuthAccount()
      const data = await getAuthenticators()

      if (data) {
        authenticators.value = data.data
      }
    }
    catch (err) {
      console.error('Failed to setup authenticators:', err)
    }
  }

  const refreshSession = async (encrypted_token: string | null = null) => {
    const { getSession } = useAllAuthAuthentication()
    const response = await getSession(encrypted_token)
    if (response) {
      session.value = response.data
    }
  }

  const clearAuthState = () => {
    session.value = undefined
    sessions.value = []
    authenticators.value = undefined
  }

  return {
    session,
    sessions,
    authenticators,
    config,
    status,
    error,
    hasSocialAccountProviders,
    hasCurrentPassword,
    otherSessions,
    totpAuthenticator,
    webauthnAuthenticator,
    recoveryCodesAuthenticator,
    setupConfig,
    setupSession,
    setupSessions,
    setupAuthenticators,
    refreshSession,
    clearAuthState,
  }
})
