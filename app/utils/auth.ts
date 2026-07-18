import { withQuery } from 'ufo'
import type { FetchResponse } from 'ofetch'
import type { H3Error } from 'h3'

export interface AuthChangeMeta {
  explicit?: boolean
}

export const callAuthChangeHook = async (
  authData: AllAuthResponse | AllAuthResponseError,
  meta: AuthChangeMeta = {},
) => {
  const nuxtApp = useNuxtApp()
  await nuxtApp.callHook('auth:change', { detail: authData, ...meta })
}

// Synthetic 410 response — for surfacing a server-driven session expiry
// (e.g. WebSocket ticket 401/403, cross-tab logout) through the canonical
// auth:change pipeline so all stores clear and navigation happens. Calling
// useUserSession().clear() in isolation leaves Pinia stores stale and
// skips the LOGOUT_REDIRECT_URL navigation.
export const SYNTHETIC_EXPIRED_SESSION: AllAuthResponseError = Object.freeze({
  status: 410,
  data: { flows: [] },
  meta: { is_authenticated: false },
}) as unknown as AllAuthResponseError

export const onAllAuthResponse = async (
  response: FetchResponse<AllAuthResponse>,
  meta: AuthChangeMeta = {},
) => {
  if (!response || !response._data) return
  log.info('auth', 'onAllAuthResponse', { status: response.status })
  // Only fire auth:change for responses that carry auth state (meta.is_authenticated).
  // Some endpoints (e.g. TOTP SVG) return `meta` with domain-specific fields (secret,
  // totp_svg) but no `is_authenticated` — treating those as auth state would make
  // determineAuthChangeEvent see is_authenticated=false and trigger an erroneous
  // LOGGED_OUT event.
  if (response.status === 200 && response._data.meta?.is_authenticated !== undefined) {
    log.info('auth', 'Auth response 200 with meta, calling auth:change hook')
    await callAuthChangeHook(response._data, meta)
  }
}

export const onAllAuthResponseError = async (
  response: FetchResponse<H3Error<AllAuthResponseError>>,
  meta: AuthChangeMeta = {},
) => {
  if (!response || !response._data) return
  log.info('auth', 'onAllAuthResponseError', { status: response.status })
  if ([401, 410].includes(response.status) && response._data.data) {
    log.info('auth', 'Status includes 401 or 410')
    await callAuthChangeHook(response._data.data, meta)
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

export const pickPreferredAuthenticatorType = (
  types: readonly string[] | undefined | null,
): string | undefined => {
  if (!types || !types.length) return undefined
  const preferred = AUTHENTICATOR_TYPE_PRIORITY.find(t => types.includes(t))
  return preferred ?? types[0]
}

export const pathForFlow = (flow: Flow, authenticatorType?: string) => {
  // provider_redirect is an external OAuth redirect, not a Nuxt page.
  // Return null so navigateToPendingFlow skips navigation.
  if (flow.id === Flows.PROVIDER_REDIRECT) return null
  const flowKey = flow.types && flow.types.length
    ? `${flow.id}:${authenticatorType ?? pickPreferredAuthenticatorType(flow.types)}`
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

// The allauth payload is `{ status, data: { flows }, meta }`. The Nuxt proxy
// re-throws Django's body via `createError({ data: payload })`, so the thrown
// `$fetch` error exposes it at `error.data.data` — `error.data` is Nitro's
// wrapper (`{ statusCode, statusMessage, data: payload }`), which carries
// `statusCode`, NOT `status`. Pull the real payload out, tolerating a path
// that exposes it directly at `error.data`.
function isAllAuthPayload(value: unknown): value is AllAuthResponseError {
  return typeof value === 'object' && value !== null
    && 'status' in value && 'data' in value
    && typeof (value as { data?: unknown }).data === 'object'
}

export function extractAllAuthError(
  error: unknown,
): AllAuthResponseError | null {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return null
  }
  const wrapper = (error as { data?: unknown }).data
  if (typeof wrapper !== 'object' || wrapper === null) {
    return null
  }
  const nested = (wrapper as { data?: unknown }).data
  if (isAllAuthPayload(nested)) return nested
  if (isAllAuthPayload(wrapper)) return wrapper
  return null
}

// A 401 carrying a *pending* flow is allauth's "advance to the next step"
// signal — login-by-code: code sent → confirm; password OK but 2FA on →
// mfa_authenticate — NOT a failure. But `$fetch` surfaces every 401 as a
// throw, so form submit handlers must inspect the error themselves and
// route to the pending flow. (The global `auth:change` hook attempts this
// too, but navigating from deep inside the fetch-error interceptor is
// unreliable; doing it from the form's own context is not.) Returns the
// target route name for `useLocalePath`, or null when there is no
// actionable pending flow (i.e. a genuine error the caller should surface).
export function pendingFlowRouteNameFromError(error: unknown) {
  const authData = extractAllAuthError(error)
  if (!authData) return null
  const pendingFlow = getPendingFlow(authData)
  if (!pendingFlow) return null
  try {
    return pathForFlow(pendingFlow)
  }
  catch {
    log.warn('auth', 'Pending flow has no known route', { flow: pendingFlow.id })
    return null
  }
}

// A pending-flow 4xx from allauth means "advance to the next step" (2FA after a
// correct password or code, confirm after a code request) — not a failure.
// Report whether the flow advanced so a form can suppress its error message,
// and navigate if needed. Callers MUST pass `fromPath` (their page's path,
// captured at setup): ofetch awaits the `auth:change` interceptor before
// rejecting, so the global hook has usually ALREADY navigated to the pending
// flow by the time a form's catch runs — comparing against the live route
// would misread that fresh advance as a same-route retry. Against `fromPath`,
// a pending flow mapping back to the form's own page is a genuine retry on the
// *same* step, which the caller must still surface as an error.
export async function tryAdvanceToPendingFlow(
  error: unknown,
  opts: { fromPath?: string } = {},
): Promise<boolean> {
  const routeName = pendingFlowRouteNameFromError(error)
  if (!routeName) return false
  const localePath = useLocalePath()
  const router = useRouter()
  const target = localePath(routeName)
  const fromPath = opts.fromPath ?? router.currentRoute.value.path
  if (fromPath === target) return false
  if (router.currentRoute.value.path === target) {
    // The auth:change hook already landed us on the flow page — nothing to
    // navigate, but this IS an advance, not an error.
    log.info('auth', 'Pending flow already reached via auth:change hook', { route: routeName })
    return true
  }
  const rawNext = router.currentRoute.value.query.next?.toString()
  const safeNext = isSafeRelativePath(rawNext) ? rawNext : undefined
  log.info('auth', 'Advancing to pending flow', { route: routeName })
  await navigateTo({ path: target, query: safeNext ? { next: safeNext } : undefined })
  return true
}

const UNSAFE_PATH_PREFIXES = ['http://', 'https://', '//', 'data:', 'javascript:', 'vbscript:']

export function isSafeRelativePath(value: string | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false
  if (trimmed.includes('\\')) return false
  const lower = trimmed.toLowerCase()
  return !UNSAFE_PATH_PREFIXES.some(prefix => lower.startsWith(prefix))
}

export const navigateToPendingFlow = async (
  response: AllAuthResponse | AllAuthResponseError,
) => {
  const nuxtApp = useNuxtApp()
  const localePath = useLocalePath()
  const path = pathForPendingFlow(response)
  log.info('auth', 'Navigating to pending flow', { path })
  if (path) {
    const rawNext = useRouter().currentRoute.value.query.next?.toString()
    const safeNext = isSafeRelativePath(rawNext) ? rawNext : undefined
    const url = withQuery(localePath(path), { next: safeNext })
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
