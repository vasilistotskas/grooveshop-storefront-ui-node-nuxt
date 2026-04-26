import { withQuery } from 'ufo'
import type { FetchResponse } from 'ofetch'
import type { H3Error } from 'h3'

const callAuthChangeHook = async (authData: AllAuthResponse | AllAuthResponseError) => {
  const nuxtApp = useNuxtApp()
  await nuxtApp.callHook('auth:change', { detail: authData })
}

export const onAllAuthResponse = async (response: FetchResponse<AllAuthResponse>) => {
  if (!response || !response._data) return
  log.info('auth', 'onAllAuthResponse', { status: response.status })
  // Only fire auth:change for responses that carry auth state (meta.is_authenticated).
  // Some endpoints (e.g. TOTP SVG) return `meta` with domain-specific fields (secret,
  // totp_svg) but no `is_authenticated` — treating those as auth state would make
  // determineAuthChangeEvent see is_authenticated=false and trigger an erroneous
  // LOGGED_OUT event.
  if (response.status === 200 && response._data.meta?.is_authenticated !== undefined) {
    log.info('auth', 'Auth response 200 with meta, calling auth:change hook')
    await callAuthChangeHook(response._data)
  }
}

export const onAllAuthResponseError = async (response: FetchResponse<H3Error<AllAuthResponseError>>) => {
  if (!response || !response._data) return
  log.info('auth', 'onAllAuthResponseError', { status: response.status })
  if ([401, 410].includes(response.status) && response._data.data) {
    log.info('auth', 'Status includes 401 or 410')
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
  const responseMeta = 'meta' in response ? response.meta as { is_authenticated?: boolean | null } | undefined : undefined
  const isAuthenticated = responseMeta?.is_authenticated === true
  const requiresReauthentication = isAuthenticated && response.status === 401
  const pendingFlow = 'data' in response ? response.data?.flows?.find(flow => flow.is_pending) ?? null : null
  const user = isAuthenticated && isAllAuthResponseSuccess(response) ? response.data.user : null
  log.info('auth', 'Auth info', { isAuthenticated, requiresReauthentication, hasPendingFlow: !!pendingFlow })
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
  log.info('auth', 'Determining auth change event', { newStatus: newAuthState.status, previousStatus: previousAuthState?.status })

  const currentAuthInfo = authInfo(newAuthState)
  const previousAuthInfo = authInfo(previousAuthState)
  // 410 GONE means the server tore down the session (expired, revoked,
  // or torn down via explicit logout). Surface as LOGGED_OUT and let the
  // auth plugin's `handleLoggedOut` decide whether to toast — it already
  // checks the `userInitiatedLogout` flag so an explicit logout stays
  // silent and a server-initiated expiry shows exactly one toast.
  if (newAuthState.status === 410) {
    return AuthChangeEvent.LOGGED_OUT
  }

  let effectivePreviousAuthInfo = previousAuthInfo
  if (
    previousAuthInfo.user
    && currentAuthInfo.user
    && previousAuthInfo.user.id !== currentAuthInfo.user.id
  ) {
    log.warn('auth', 'Previous auth info user ID does not match current auth info user ID')
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
    log.info('auth', 'Was not authenticated and is authenticated')
    if (isReauthRequired) return AuthChangeEvent.REAUTHENTICATION_REQUIRED
    if (hasAccessToken || hasSessionToken) return AuthChangeEvent.LOGGED_IN
  }
  if (wasAuthenticated && isAuthenticated) {
    log.info('auth', 'Was authenticated and is authenticated')
    if (!wasReauthRequired && isReauthRequired) return AuthChangeEvent.REAUTHENTICATION_REQUIRED
    if (wasReauthRequired && !isReauthRequired) return AuthChangeEvent.REAUTHENTICATED
    if (methodsHaveIncreased(previousAuthState, newAuthState)) return AuthChangeEvent.REAUTHENTICATED
    if (wasReauthRequired && isReauthRequired) return AuthChangeEvent.REAUTHENTICATION_REQUIRED
  }
  if (!wasAuthenticated && !isAuthenticated) {
    log.info('auth', 'Was not authenticated and is not authenticated')
    return hasFlowUpdated(previousAuthInfo.pendingFlow, currentAuthInfo.pendingFlow)
      ? AuthChangeEvent.FLOW_UPDATED
      : AuthChangeEvent.LOGGED_OUT
  }
  if (wasAuthenticated && !isAuthenticated) {
    log.info('auth', 'Was authenticated and is not authenticated')
    return AuthChangeEvent.LOGGED_OUT
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

export const pathForFlow = (flow: Flow, authenticatorType?: string) => {
  const flowKey = flow.types && flow.types.length
    ? `${flow.id}:${authenticatorType ?? flow.types[0]}`
    : flow.id
  const path = Flow2path[flowKey] ?? Flow2path[flow.id]
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
  return pendingFlows[0] ?? null
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
  log.info('auth', 'Navigating to pending flow', { path })
  if (path) {
    const next = useRouter().currentRoute.value.query.next
    const url = withQuery(localePath(path), { next })
    log.info('auth', 'Navigating to URL', { url })
    return nuxtApp.runWithContext(() => navigateTo(url))
  }
  else {
    log.warn('auth', 'No pending flow to navigate to')
  }
}

export function isAllAuthResponseSuccess(response: AllAuthResponse | AllAuthResponseError): response is AllAuthResponse {
  return response.status === 200
}

export function isAllAuthResponseError(response: AllAuthResponse | AllAuthResponseError): response is AllAuthResponseError {
  return response.status !== 200
}
