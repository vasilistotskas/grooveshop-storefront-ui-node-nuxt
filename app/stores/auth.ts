import type { IFetchError } from 'ofetch'
import {
  type AuthenticatorsResponse,
  AuthenticatorType,
  type ConfigResponse,
  type SessionResponse,
  type SessionsGetResponse,
} from '~/types/all-auth'
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

  const hasSocialaccountProviders = computed(() => {
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
    const { data, status: configStatus } = await useAsyncData(
      'config',
      () => $fetch(
        `/api/_allauth/app/v1/config`,
        {
          method: 'GET',
          headers: useRequestHeaders(),
          credentials: 'include',
          onResponse({ response }) {
            if (!response.ok) {
              return
            }
          },
          onResponseError(context) {
            config.value = undefined
            status.value.config = 'error'
            error.value.config = context.error
          },
        },
      ),
    )
    if (data.value) {
      config.value = data.value.data
    }
    status.value.config = configStatus.value
  }

  const setupSession = async () => {
    const { loggedIn, clear } = useUserSession()
    if (!loggedIn.value) {
      return
    }
    const { getSession } = useAllAuthAuthentication()
    const { data, error } = await useAsyncData(
      'session',
      () => getSession(),
    )
    if (error.value) {
      await clear()
    }
    if (data.value) {
      session.value = data.value.data
    }
  }

  const setupSessions = async () => {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) {
      return
    }
    const { getSessions } = useAllAuthSessions()
    const { data } = await useAsyncData(
      'sessions',
      () => getSessions(),
    )
    if (data.value) {
      sessions.value = data.value.data
    }
  }

  const setupAuthenticators = async () => {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) {
      return
    }
    const { getAuthenticators } = useAllAuthAccount()
    const { data } = await useAsyncData(
      'authenticators',
      () => getAuthenticators(),
    )
    if (data.value) {
      authenticators.value = data.value.data
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
    hasSocialaccountProviders,
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
