import type { AllAuthResponse, AllAuthResponseError, AuthChangeEventType } from '~/types/all-auth'
import { AuthChangeEvent, URLs } from '~/types/all-auth'

export default defineNuxtPlugin({
  name: 'auth',
  parallel: true,
  async setup(nuxtApp) {
    const authState = useState<AllAuthResponse | AllAuthResponseError>('authState')
    const authEvent = useState<AuthChangeEventType>('authEvent')

    const { loggedIn, fetch, clear } = useUserSession()

    const userStore = useUserStore()
    const { setupSessions } = userStore

    if (loggedIn.value) {
      await setupSessions()
    }

    const fromAuth = ref(authState.value)

    nuxtApp.hook('auth:change', async ({ detail }) => {
      if (fromAuth.value) {
        authEvent.value = determineAuthChangeEvent(fromAuth.value, detail)
      }

      authState.value = detail

      if (detail.status === 200 && detail.meta?.access_token && detail.data.user) {
        await fetch()
      }

      fromAuth.value = detail
    })

    watch(
      () => [authEvent.value, authState.value],
      async ([newVal, _oldVal]) => {
        const auth = authState.value

        switch (newVal) {
          case AuthChangeEvent.LOGGED_OUT:
            await clear()
            return nuxtApp.runWithContext(() => navigateTo({
              path: URLs.LOGOUT_REDIRECT_URL,
            }))
          case AuthChangeEvent.LOGGED_IN: {
            const route = useRouter().currentRoute.value
            const returnToPath = route.query.next?.toString()
            const isRedirectingToLogin = returnToPath === '/account/login'
            const redirectTo = isRedirectingToLogin ? URLs.LOGIN_REDIRECT_URL : returnToPath || URLs.LOGIN_REDIRECT_URL
            return nuxtApp.runWithContext(() => navigateTo(redirectTo))
          }
          case AuthChangeEvent.REAUTHENTICATED: {
            const router = useRouter()
            const next = router.currentRoute.value.query.next
            if (next) {
              return nuxtApp.runWithContext(() => navigateTo(next as string))
            }
            break
          }
          case AuthChangeEvent.REAUTHENTICATION_REQUIRED: {
            const router = useRouter()
            const next = router.currentRoute.value.fullPath
            if ('data' in auth) {
              const flowId = auth.data?.flows?.[0]?.id
              if (flowId) {
                const path = pathForFlow(flowId)
                return nuxtApp.runWithContext(() => navigateTo({
                  path,
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
