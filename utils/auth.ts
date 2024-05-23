import type {
  AllAuthError,
  AllAuthResponse,
  AllAuthResponseError,
  BadResponse,
  FlowId,
  InvalidSessionResponse,
  NotAuthenticatedResponse,
} from '~/types/all-auth'
import {
  AuthChangeEvent,
  Flow2path,
  URLs,
  ZodBadResponse,
  ZodInvalidSessionResponse,
  ZodNotAuthenticatedResponse,
} from '~/types/all-auth'

export const isBadResponseError = (error: any): error is { data: BadResponse } => {
  return ZodBadResponse.safeParse(error.data).success
}

export const isNotAuthenticatedResponseError = (error: any): error is { data: NotAuthenticatedResponse } => {
  return ZodNotAuthenticatedResponse.safeParse(error.data).success
}

export const isInvalidSessionResponseError = (error: any): error is { data: InvalidSessionResponse } => {
  return ZodInvalidSessionResponse.safeParse(error.data).success
}

export const isAllAuthError = (error: unknown): error is AllAuthError => {
  if (typeof error !== 'object' || error === null || !('data' in error)) {
    return false
  }

  return isBadResponseError(error) || isNotAuthenticatedResponseError(error) || isInvalidSessionResponseError(error)
}

export const onAllAuthResponse = async (response: AllAuthResponse) => {
  const nuxtApp = useNuxtApp()

  if (response.status === 200 && response.meta?.is_authenticated) {
    await nuxtApp.callHook('auth:change', { detail: response })
  }
}

export const onAllAuthResponseError = async (response: { data: AllAuthResponseError }) => {
  const nuxtApp = useNuxtApp()
  if ([401, 410].includes(response.data?.status)) {
    await nuxtApp.callHook('auth:change', { detail: response.data })
  }
}

export const authInfo = (auth: AllAuthResponse | AllAuthResponseError) => {
  if (auth.status === 400 || auth.status === 401) {
    return {
      isAuthenticated: false,
      requiresReauthentication: auth.status === 401 && auth.meta?.is_authenticated,
      user: null,
      pendingFlow: 'data' in auth ? auth.data?.flows.find(flow => flow.is_pending) : null,
    }
  }
  else if (auth.status === 200) {
    return {
      isAuthenticated: true,
      requiresReauthentication: false,
      user: auth.data?.user || null,
      pendingFlow: 'data' in auth ? auth.data?.flows?.find(flow => flow.is_pending) : null,
    }
  }
  return {
    isAuthenticated: false,
    requiresReauthentication: false,
    user: null,
    pendingFlow: null,
  }
}

export const determineAuthChangeEvent = (
  fromAuth: AllAuthResponse | AllAuthResponseError,
  toAuth: AllAuthResponse | AllAuthResponseError,
) => {
  let fromInfo = authInfo(fromAuth)
  const toInfo = authInfo(toAuth)
  if (toAuth.status === 410) {
    return AuthChangeEvent.LOGGED_OUT
  }
  if (fromInfo.user && toInfo.user && fromInfo.user?.id !== toInfo.user?.id) {
    fromInfo = { isAuthenticated: false, requiresReauthentication: false, user: null, pendingFlow: null }
  }
  if (!fromInfo.isAuthenticated && toInfo.isAuthenticated) {
    return AuthChangeEvent.LOGGED_IN
  }
  else if (fromInfo.isAuthenticated && !toInfo.isAuthenticated) {
    return AuthChangeEvent.LOGGED_OUT
  }
  else if (fromInfo.isAuthenticated && toInfo.isAuthenticated) {
    if (toInfo.requiresReauthentication) {
      return AuthChangeEvent.REAUTHENTICATION_REQUIRED
    }
    else if (fromInfo.requiresReauthentication) {
      return AuthChangeEvent.REAUTHENTICATED
    }
    else if ('data' in fromAuth && 'data' in toAuth) {
      if ('methods' in fromAuth.data && 'methods' in toAuth.data && fromAuth.data?.methods.length < toAuth.data?.methods.length) {
        return AuthChangeEvent.REAUTHENTICATED
      }
    }
  }
  else if (!fromInfo.isAuthenticated && !toInfo.isAuthenticated) {
    const fromFlow = fromInfo.pendingFlow
    const toFlow = toInfo.pendingFlow
    if (toFlow?.id && fromFlow?.id !== toFlow.id) {
      return AuthChangeEvent.FLOW_UPDATED
    }
  }
  return null
}

export function pathForFlow(flowId: FlowId) {
  const path = Flow2path[flowId]
  if (!path) {
    throw new Error(`Unknown path for flow: ${flowId}`)
  }
  return path
}

export const pathForPendingFlow = (auth: AllAuthResponse | AllAuthResponseError) => {
  const flow = 'data' in auth ? auth.data?.flows?.find(flow => flow.is_pending) : null
  if (flow) {
    return pathForFlow(flow.id)
  }
  return null
}

export const navigateToPendingFlow = (auth: AllAuthResponse | AllAuthResponseError) => {
  const nuxtApp = useNuxtApp()
  const path = pathForPendingFlow(auth)
  if (path) {
    return nuxtApp.runWithContext(() => navigateTo(path))
  }
  return null
}

export const AuthenticatedRoute = () => {
  const nuxtApp = useNuxtApp()
  const route = useRoute()

  const auth = useState<AllAuthResponse | AllAuthResponseError>('authState')
  const authStatus = authInfo(auth.value)

  const next = `next=${encodeURIComponent(route.fullPath)}`

  if (authStatus.isAuthenticated) {
    return
  }
  else {
    return nuxtApp.runWithContext(() => navigateTo({
      path: URLs.LOGIN_URL,
      query: {
        next,
      },
    }),
    )
  }
}

export const AnonymousRoute = () => {
  const nuxtApp = useNuxtApp()
  const auth = useState<AllAuthResponse | AllAuthResponseError>('authState')
  const authStatus = authInfo(auth.value)

  if (!authStatus.isAuthenticated) {
    return
  }
  else {
    return nuxtApp.runWithContext(() => navigateTo({
      path: URLs.LOGIN_REDIRECT_URL,
    }),
    )
  }
}
