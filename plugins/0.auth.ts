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
        console.log('===== fromAuth =====', fromAuth.value)
        console.log('===== toAuth =====', toAuth)
        const event = determineAuthChangeEvent(fromAuth.value, toAuth)

        console.log('===== auth:change determineAuthChangeEvent =====', event)
        authEvent.value = event
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
        console.log('===== newVal =====', newVal)
        console.log('===== _oldVal =====', _oldVal)
        switch (newVal) {
          case AuthChangeEvent.LOGGED_OUT:
            console.log('====== 1 ======')
            await clear()
            return await nuxtApp.runWithContext(() => navigateTo({
              path: URLs.LOGOUT_REDIRECT_URL,
            }))
          case AuthChangeEvent.LOGGED_IN: {
            const route = useRouter().currentRoute.value
            console.log('====== 2 ======')
            const returnToPath = route.query.next?.toString()
            const isRedirectingToLogin = returnToPath === '/account/login'
            const redirectTo = isRedirectingToLogin ? URLs.LOGIN_REDIRECT_URL : returnToPath || URLs.LOGIN_REDIRECT_URL
            return await nuxtApp.runWithContext(() => navigateTo(redirectTo))
          }
          case AuthChangeEvent.REAUTHENTICATED: {
            const router = useRouter()
            const next = router.currentRoute.value.query.next
            console.log('====== 3 ======', next)
            if (next) {
              return await nuxtApp.runWithContext(() => navigateTo(next as string))
            }
            break
          }
          case AuthChangeEvent.REAUTHENTICATION_REQUIRED: {
            const router = useRouter()
            const next = router.currentRoute.value.fullPath
            console.log('====== 4 ======')
            if ('data' in auth) {
              const flowId = auth.data.flows?.[0].id
              console.log('====== 4 flowId ======', flowId)
              if (flowId) {
                const path = pathForFlow(flowId)
                console.log('====== 4 path ======', path)
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
            console.log('====== 5 ======')
            return await navigateToPendingFlow(auth)
          }
          default:
            break
        }
      },
    )

    nuxtApp.provide('authState', authState)
  },
})
