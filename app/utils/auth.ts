import type { AllAuthResponse, AllAuthResponseError, FlowId } from '~/types/all-auth'
import { AuthChangeEvent, Flow2path } from '~/types/all-auth'

export const onAllAuthResponse = async (response: AllAuthResponse) => {
  if (!response) {
    return
  }
  const nuxtApp = useNuxtApp()
  if (response.status === 200 && response.meta?.is_authenticated) {
    await nuxtApp.callHook('auth:change', { detail: response })
  }
}

export const onAllAuthResponseError = async (response: { data: AllAuthResponseError }) => {
  if (!response) {
    return
  }
  const nuxtApp = useNuxtApp()
  if ([401, 410].includes(response.data?.status)) {
    await nuxtApp.callHook('auth:change', { detail: response.data })
  }
}

export const authInfo = (auth: AllAuthResponse | AllAuthResponseError) => {
  const isAuthenticated = auth.status === 200 || (auth.status === 401 && auth.meta.is_authenticated)
  const requiresReauthentication = isAuthenticated && auth.status === 401
  const pendingFlow = 'data' in auth ? auth.data?.flows?.find(flow => flow.is_pending) : null
  return { isAuthenticated, requiresReauthentication, user: isAuthenticated ? auth.data.user : null, pendingFlow }
}

export const determineAuthChangeEvent = (
  fromAuth: AllAuthResponse | AllAuthResponseError,
  toAuth: AllAuthResponse | AllAuthResponseError,
) => {
  const toast = useToast()
  const { t } = useNuxtApp().$i18n

  let fromInfo = authInfo(fromAuth)
  const toInfo = authInfo(toAuth)

  if (toAuth.status === 410) {
    toast.add({
      title: t('common.auth.error.session.expired'),
      color: 'yellow',
    })
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
    else if (('data' in fromAuth && 'data' in toAuth) && ('methods' in fromAuth.data && 'methods' in toAuth.data)) {
      if ((fromAuth.data.methods && toAuth.data.methods) && fromAuth.data.methods?.length < toAuth.data.methods?.length) {
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
  const pendingFlows = 'data' in auth ? auth.data?.flows?.filter(flow => flow.is_pending) : []
  if (!pendingFlows) {
    return null
  }
  const lastPendingFlow = pendingFlows[pendingFlows.length - 1]
  if (lastPendingFlow) {
    return pathForFlow(lastPendingFlow.id)
  }
  return null
}

export const navigateToPendingFlow = async (auth: AllAuthResponse | AllAuthResponseError) => {
  const nuxtApp = useNuxtApp()
  const path = pathForPendingFlow(auth)
  if (path) {
    return nuxtApp.runWithContext(() => navigateTo(path))
  }
  return null
}
