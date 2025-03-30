import { withQuery } from 'ufo'
import type { FetchResponse } from 'ofetch'
import type { H3Error } from 'h3'

// Utility function to call the auth:change hook
const callAuthChangeHook = async (authData: AllAuthResponse | AllAuthResponseError) => {
  const nuxtApp = useNuxtApp()
  await nuxtApp.callHook('auth:change', { detail: authData })
}

export const onAllAuthResponse = async (response: FetchResponse<AllAuthResponse>) => {
  if (!response || !response._data) return
  console.debug('onAllAuthResponse', response)
  if (response.status === 200 && response._data.meta?.is_authenticated) {
    console.debug('Status is 200 and is authenticated', response._data)
    await callAuthChangeHook(response._data)
  }
}

export const onAllAuthResponseError = async (response: FetchResponse<H3Error<AllAuthResponseError>>) => {
  if (!response || !response._data) return
  console.debug('onAllAuthResponseError', response)
  console.debug('response.status', response.status)
  if ([401, 410].includes(response.status) && response._data.data) {
    console.debug('Status includes 401 or 410', response._data)
    await callAuthChangeHook(response._data.data)
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
  const isAuthenticated = (response.status === 200 || (response.status === 401 && response.meta?.is_authenticated)) ?? false
  const requiresReauthentication = isAuthenticated && response.status === 401
  const pendingFlow = 'data' in response ? response.data?.flows?.find(flow => flow.is_pending) ?? null : null
  const user = isAuthenticated && isAllAuthResponseSuccess(response) ? response.data.user : null
  console.debug('Auth info:', { isAuthenticated, requiresReauthentication, pendingFlow })
  return {
    isAuthenticated,
    requiresReauthentication,
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
  console.debug('New auth state:', newAuthState)
  console.debug('Previous auth state:', previousAuthState)

  const currentAuthInfo = authInfo(newAuthState)
  const previousAuthInfo = authInfo(previousAuthState)
  console.debug('Current auth info:', currentAuthInfo)
  console.debug('Previous auth info:', previousAuthInfo)

  if (newAuthState.status === 410) {
    toast.add({
      title: t('auth.error.session.expired'),
      color: 'warning',
    })
    return AuthChangeEvent.LOGGED_OUT
  }

  let effectivePreviousAuthInfo = previousAuthInfo
  if (
    previousAuthInfo.user
    && currentAuthInfo.user
    && previousAuthInfo.user.id !== currentAuthInfo.user.id
  ) {
    console.warn('Previous auth info user ID does not match current auth info user ID')
    effectivePreviousAuthInfo = {
      isAuthenticated: false,
      requiresReauthentication: false,
      user: null,
      pendingFlow: null,
    }
  }

  const wasAuthenticated = effectivePreviousAuthInfo.isAuthenticated
  const isAuthenticated = currentAuthInfo.isAuthenticated
  const wasReauthRequired = effectivePreviousAuthInfo.requiresReauthentication
  const isReauthRequired = currentAuthInfo.requiresReauthentication
  const hasAccessToken = newAuthState.status === 200 && newAuthState.meta?.access_token
  const hasSessionToken = newAuthState.status === 200 && newAuthState.meta?.session_token

  if (!wasAuthenticated && isAuthenticated) {
    console.debug('Was not authenticated and is authenticated')
    if (isReauthRequired) return AuthChangeEvent.REAUTHENTICATION_REQUIRED
    if (hasAccessToken || hasSessionToken) return AuthChangeEvent.LOGGED_IN
  }
  if (wasAuthenticated && isAuthenticated) {
    console.debug('Was authenticated and is authenticated')
    if (!wasReauthRequired && isReauthRequired) return AuthChangeEvent.REAUTHENTICATION_REQUIRED
    if (wasReauthRequired && !isReauthRequired) return AuthChangeEvent.REAUTHENTICATED
    if (methodsHaveIncreased(previousAuthState, newAuthState)) return AuthChangeEvent.REAUTHENTICATED
    if (wasReauthRequired && isReauthRequired) return AuthChangeEvent.REAUTHENTICATION_REQUIRED
  }
  if (!wasAuthenticated && !isAuthenticated) {
    console.debug('Was not authenticated and is not authenticated')
    return hasFlowUpdated(previousAuthInfo.pendingFlow, currentAuthInfo.pendingFlow)
      ? AuthChangeEvent.FLOW_UPDATED
      : AuthChangeEvent.LOGGED_OUT
  }
  console.debug('Was authenticated and is not authenticated')
  if (wasAuthenticated && !isAuthenticated) return AuthChangeEvent.LOGGED_OUT
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

export const pathForFlow = (flow: Flow, type?: string) => {
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
) => {
  const pendingFlow = getPendingFlow(response)
  return pendingFlow ? pathForFlow(pendingFlow) : null
}

export const navigateToPendingFlow = async (
  response: AllAuthResponse | AllAuthResponseError,
) => {
  const nuxtApp = useNuxtApp()
  const localePath = useLocalePath()
  const path = pathForPendingFlow(response)
  console.debug('Navigating to pending flow:', path)
  if (path) {
    const next = useRouter().currentRoute.value.query.next
    const url = withQuery(localePath(path), { next })
    console.debug('Navigating to URL:', url)
    await nuxtApp.runWithContext(() => navigateTo(url))
  }
  else {
    console.warn('No pending flow to navigate to')
  }
}

export function isAllAuthResponseSuccess(response: AllAuthResponse | AllAuthResponseError): response is AllAuthResponse {
  return response.status === 200
}

export function isAllAuthResponseError(response: AllAuthResponse | AllAuthResponseError): response is AllAuthResponseError {
  return response.status !== 200
}
