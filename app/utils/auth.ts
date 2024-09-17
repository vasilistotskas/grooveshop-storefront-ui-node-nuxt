import type {
  AllAuthResponse,
  AllAuthResponseError,
  AuthChangeEventType,
  Flow,
  AuthInfo,
} from '~/types/all-auth'
import { AuthChangeEvent, Flow2path } from '~/types/all-auth'

export const onAllAuthResponse = async (response: AllAuthResponse) => {
  if (!response) return
  const nuxtApp = useNuxtApp()
  if (response.status === 200 && response.meta?.is_authenticated) {
    console.info('Authenticated', response)
    await nuxtApp.callHook('auth:change', { detail: response })
  }
}

export const onAllAuthResponseError = async (response: {
  data: AllAuthResponseError
}) => {
  if (!response) return
  const nuxtApp = useNuxtApp()
  if ([401, 410].includes(response.data?.status)) {
    console.info('Unauthorized or session expired', response.data)
    await nuxtApp.callHook('auth:change', { detail: response.data })
  }
}

export const authInfo = (
  response?: AllAuthResponse | AllAuthResponseError | null,
): AuthInfo => {
  if (!response) {
    return {
      isAuthenticated: false,
      requiresReauthentication: false,
      user: null,
      pendingFlow: null,
    }
  }
  const isAuthenticated = response.status === 200 || (response.status === 401 && response.meta?.is_authenticated)
  const requiresReauthentication = isAuthenticated && response.status === 401
  const pendingFlow = 'data' in response
    ? response.data?.flows?.find(flow => flow.is_pending) ?? null
    : null
  const user = isAuthenticated && 'data' in response ? response.data.user : null
  return {
    isAuthenticated: isAuthenticated || false,
    requiresReauthentication: requiresReauthentication || false,
    user,
    pendingFlow,
  }
}

export const determineAuthChangeEvent = (
  newAuthState: AllAuthResponse | AllAuthResponseError,
  previousAuthState?: AllAuthResponse | AllAuthResponseError | null,
): AuthChangeEventType | null => {
  const toast = useToast()
  const { t } = useNuxtApp().$i18n

  const currentAuthInfo = authInfo(newAuthState)
  let previousAuthInfo = authInfo(previousAuthState)

  console.log('newAuthState:', newAuthState)
  console.log('previousAuthState:', previousAuthState)
  console.log('Previous auth info:', previousAuthInfo)
  console.log('Current auth info:', currentAuthInfo)

  // Handle session expiration
  if (newAuthState.status === 410) {
    toast.add({
      title: t('auth.error.session.expired'),
      color: 'yellow',
    })
    return AuthChangeEvent.LOGGED_OUT
  }

  // Check if user has changed
  if (
    previousAuthInfo.user
    && currentAuthInfo.user
    && previousAuthInfo.user.id !== currentAuthInfo.user.id
  ) {
    console.log('User has changed')
    previousAuthInfo = {
      isAuthenticated: false,
      requiresReauthentication: false,
      user: null,
      pendingFlow: null,
    }
  }

  const wasAuthenticated = previousAuthInfo.isAuthenticated
  const isAuthenticated = currentAuthInfo.isAuthenticated
  const wasReauthRequired = previousAuthInfo.requiresReauthentication
  const isReauthRequired = currentAuthInfo.requiresReauthentication
  const hasAccessToken = newAuthState.status === 200 && newAuthState.meta?.access_token
  const hasSessionToken = newAuthState.status === 200 && newAuthState.meta?.session_token

  if (wasAuthenticated && !isAuthenticated) {
    console.log('Logged out')
    return AuthChangeEvent.LOGGED_OUT
  }

  if (!wasAuthenticated && isAuthenticated) {
    if (isReauthRequired) {
      console.log('Reauthentication required')
      return AuthChangeEvent.REAUTHENTICATION_REQUIRED
    }
    console.log('Logged in')

    if (hasAccessToken || hasSessionToken) {
      console.log('Access or session token received')
      return AuthChangeEvent.LOGGED_IN
    }
  }

  if (wasAuthenticated && isAuthenticated) {
    if (!wasReauthRequired && isReauthRequired) {
      console.log('Reauthentication required')
      return AuthChangeEvent.REAUTHENTICATION_REQUIRED
    }
    if (wasReauthRequired && !isReauthRequired) {
      console.log('Reauthenticated')
      return AuthChangeEvent.REAUTHENTICATED
    }
    if (methodsHaveIncreased(previousAuthState, newAuthState)) {
      console.log('Reauthenticated with new method')
      return AuthChangeEvent.REAUTHENTICATED
    }
  }

  if (!wasAuthenticated && !isAuthenticated) {
    if (hasFlowUpdated(previousAuthInfo.pendingFlow, currentAuthInfo.pendingFlow)) {
      console.log('Flow updated')
      return AuthChangeEvent.FLOW_UPDATED
    }
  }

  return null
}

function methodsHaveIncreased(
  previousAuthState: AllAuthResponse | AllAuthResponseError | null | undefined,
  newAuthState: AllAuthResponse | AllAuthResponseError,
): boolean {
  if (
    previousAuthState
    && 'data' in previousAuthState
    && 'data' in newAuthState
    && 'methods' in previousAuthState.data
    && 'methods' in newAuthState.data
    && previousAuthState.data.methods
    && newAuthState.data.methods
  ) {
    return previousAuthState.data.methods.length < newAuthState.data.methods.length
  }
  return false
}

function hasFlowUpdated(
  previousFlow: Flow | null,
  currentFlow: Flow | null,
): boolean {
  if (currentFlow && (!previousFlow || currentFlow.id !== previousFlow.id)) {
    return true
  }
  return currentFlow?.is_pending ?? false
}

export const pathForFlow = (flow: Flow, type?: string): string => {
  const key = flow.types && flow.types.length
    ? `${flow.id}:${type ?? flow.types[0]}`
    : flow.id
  const path = Flow2path[key] ?? Flow2path[flow.id]
  if (!path) {
    throw new Error(`Unknown path for flow: ${flow.id}`)
  }
  return path
}

export const getPendingFlows = (
  response: AllAuthResponse | AllAuthResponseError,
): Flow[] => {
  if ('data' in response && response.data?.flows) {
    return response.data.flows.filter(flow => flow.is_pending)
  }
  return []
}

export const getPendingFlow = (
  response: AllAuthResponse | AllAuthResponseError,
): Flow | null => {
  const pendingFlows = getPendingFlows(response)
  return pendingFlows[pendingFlows.length - 1] ?? null
}

export const pathForPendingFlow = (
  response: AllAuthResponse | AllAuthResponseError,
): string | null => {
  const pendingFlow = getPendingFlow(response)
  return pendingFlow ? pathForFlow(pendingFlow) : null
}

export const navigateToPendingFlow = async (
  response: AllAuthResponse | AllAuthResponseError,
) => {
  console.log('Navigating to pending flow...', response)
  const nuxtApp = useNuxtApp()
  const localePath = useLocalePath()
  const path = pathForPendingFlow(response)
  if (path) {
    const url = localePath(path)
    await nuxtApp.runWithContext(() => navigateTo(url))
  }
  else {
    console.warn('No pending flow to navigate to')
  }
}
