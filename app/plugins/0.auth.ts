import type { AllAuthResponse, AllAuthResponseError, AuthChangeEventType } from '~/types/all-auth'
import { AuthChangeEvent, URLs } from '~/types/all-auth'

export default defineNuxtPlugin({
  name: 'auth',
  parallel: true,
  async setup(nuxtApp) {
    const authState = useState<AllAuthResponse | AllAuthResponseError>('authState')
    const authEvent = useState<AuthChangeEventType>('authEvent')

    const { fetch, clear } = useUserSession()

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
      fromAuth.value = detail
    })

    watch(
      () => [authEvent.value, authState.value],
      async ([authEventVal, _authStateVal]) => {
        const auth = authState.value
        const localePath = useLocalePath()
        switch (authEventVal) {
          case AuthChangeEvent.LOGGED_OUT:
            await clear()
            return nuxtApp.runWithContext(() => navigateTo({
              path: localePath(URLs.LOGOUT_REDIRECT_URL),
            }))
          case AuthChangeEvent.LOGGED_IN: {
            const route = useRouter().currentRoute.value
            const returnToPath = route.query.next?.toString()
            const isRedirectingToLogin = returnToPath === '/account/login'
            const redirectTo = isRedirectingToLogin ? URLs.LOGIN_REDIRECT_URL : returnToPath || URLs.LOGIN_REDIRECT_URL
            return nuxtApp.runWithContext(() => navigateTo(localePath(redirectTo)))
          }
          case AuthChangeEvent.REAUTHENTICATED: {
            const router = useRouter()
            const next = router.currentRoute.value.query.next
            if (next) {
              return nuxtApp.runWithContext(() => navigateTo(localePath(next as string)))
            }
            return nuxtApp.runWithContext(() => navigateTo(localePath(URLs.LOGIN_REDIRECT_URL)))
          }
          case AuthChangeEvent.REAUTHENTICATION_REQUIRED: {
            const router = useRouter()
            const next = router.currentRoute.value.fullPath
            if ('data' in auth) {
              const flow = auth.data?.flows?.[0]
              if (flow) {
                const path = pathForFlow(flow)
                return nuxtApp.runWithContext(() => navigateTo({
                  path: localePath(path),
                  query: {
                    next,
                  },
                }))
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

    nuxtApp.provide('authState', authState)
  },
})
