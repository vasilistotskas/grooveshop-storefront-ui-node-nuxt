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
      const toAuth = detail

      if (fromAuth.value) {
        authEvent.value = determineAuthChangeEvent(fromAuth.value, toAuth)
      }

      authState.value = toAuth

      if (toAuth.status === 200 && toAuth.meta?.access_token && toAuth.data.user) {
        await fetch()
      }

      fromAuth.value = toAuth
    })

    watch(
      () => authEvent.value,
      async (newVal, _oldVal) => {
        const auth = authState.value
        switch (newVal) {
          case AuthChangeEvent.LOGGED_OUT:
            await clear()
            return await nuxtApp.runWithContext(() => navigateTo({
              path: URLs.LOGOUT_REDIRECT_URL,
            }))
          case AuthChangeEvent.LOGGED_IN: {
            const route = useRouter().currentRoute.value
            const returnToPath = route.query.next?.toString()
            const isRedirectingToLogin = returnToPath === '/account/login'
            const redirectTo = isRedirectingToLogin ? URLs.LOGIN_REDIRECT_URL : returnToPath || URLs.LOGIN_REDIRECT_URL
            return await nuxtApp.runWithContext(() => navigateTo(redirectTo))
          }
          case AuthChangeEvent.REAUTHENTICATED: {
            const router = useRouter()
            const next = router.currentRoute.value.query.next
            if (next) {
              return await nuxtApp.runWithContext(() => navigateTo(next as string))
            }
            break
          }
          case AuthChangeEvent.REAUTHENTICATION_REQUIRED: {
            const router = useRouter()
            const next = router.currentRoute.value.fullPath
            if ('data' in auth) {
              const flowId = auth.data.flows?.[0].id
              if (flowId) {
                const path = pathForFlow(flowId)
                return await nuxtApp.runWithContext(() => navigateTo({
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
