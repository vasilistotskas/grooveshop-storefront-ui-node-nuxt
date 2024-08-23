import { withQuery } from 'ufo'
import type { AllAuthResponse, AllAuthResponseError, AuthChangeEventType } from '~/types/all-auth'
import { AuthChangeEvent, Flow2path, URLs } from '~/types/all-auth'
import { pathForPendingFlow } from '~/utils/auth'

export default defineNuxtPlugin({
  name: 'auth',
  parallel: true,
  async setup(nuxtApp) {
    const authState = useState<AllAuthResponse | AllAuthResponseError>('authState')
    const authEvent = useState<AuthChangeEventType>('authEvent')

    const { fetch, loggedIn, clear } = useUserSession()

    const fromAuth = ref<AllAuthResponse | AllAuthResponseError | null>(authState.value)

    nuxtApp.hook('auth:change', async ({ detail }) => {
      if (fromAuth.value) {
        authEvent.value = determineAuthChangeEvent(detail, fromAuth.value)
      }
      authState.value = detail

      if (detail.status === 200 && detail.meta?.access_token && detail.data.user) {
        if (!fromAuth.value) {
          authEvent.value = AuthChangeEvent.LOGGED_IN
        }
        await fetch()
      }

      if ((detail.status === 401 || detail.status === 410) && detail.data?.flows?.length) {
        const path = pathForPendingFlow(detail)
        const isReauthenticateFlow = detail.data.flows.some(flow => flow.id === 'reauthenticate')
        if (!fromAuth.value && path) {
          authEvent.value = AuthChangeEvent.FLOW_UPDATED
        }
        else if (!fromAuth.value && isReauthenticateFlow) {
          authEvent.value = AuthChangeEvent.REAUTHENTICATION_REQUIRED
        }
      }

      fromAuth.value = detail
    })

    watch(
      () => [authEvent.value, authState.value],
      async ([authEventVal, _authStateVal]) => {
        const auth = authState.value
        const localePath = useLocalePath()
        const router = useRouter()
        const authStore = useAuthStore()
        const { refreshSession, clearSession } = authStore

        switch (authEventVal) {
          case AuthChangeEvent.LOGGED_OUT: {
            clearSession()
            if (loggedIn.value) {
              await clear()
            }
            return nuxtApp.runWithContext(() => navigateTo(localePath(URLs.LOGIN_REDIRECT_URL)))
          }
          case AuthChangeEvent.LOGGED_IN: {
            const route = router.currentRoute.value
            const returnToPath = route.query.next?.toString()
            const isRedirectingToLogin = returnToPath === '/account/login'
            const redirectTo = isRedirectingToLogin ? URLs.LOGIN_REDIRECT_URL : returnToPath || URLs.LOGIN_REDIRECT_URL
            await refreshSession()
            return nuxtApp.runWithContext(() => navigateTo(localePath(redirectTo)))
          }
          case AuthChangeEvent.REAUTHENTICATED: {
            const next = router.currentRoute.value.query.next
            if (next) {
              return nuxtApp.runWithContext(() => navigateTo(localePath(next as string)))
            }
            return nuxtApp.runWithContext(() => navigateTo(localePath(URLs.LOGIN_REDIRECT_URL)))
          }
          case AuthChangeEvent.REAUTHENTICATION_REQUIRED: {
            const next = router.currentRoute.value.fullPath
            if ('data' in auth) {
              const flow = auth.data?.flows?.find(flow => flow.is_pending)
              if (flow) {
                const path = pathForFlow(flow)
                const url = withQuery(localePath(path), {
                  next,
                })
                return nuxtApp.runWithContext(() => navigateTo(url))
              }
              else {
                const isReauthenticateFlow = auth.data?.flows?.some(flow => flow.id === 'reauthenticate')
                if (isReauthenticateFlow) {
                  const flow = Flow2path['reauthenticate']
                  const url = withQuery(localePath(flow), {
                    next,
                  })
                  return nuxtApp.runWithContext(() => navigateTo(url))
                }
              }
            }
            break
          }
          case AuthChangeEvent.FLOW_UPDATED: {
            return await navigateToPendingFlow(auth)
          }
          default:
            break
        }
      },
      { deep: true },
    )

    watch(
      () => loggedIn.value,
      async () => {
        await refreshNuxtData()
      },
    )

    nuxtApp.provide('authState', authState)
  },
})
