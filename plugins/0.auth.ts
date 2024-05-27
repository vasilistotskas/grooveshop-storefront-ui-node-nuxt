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

    const prevAuth = ref(authState.value)

    nuxtApp.hook('auth:change', async ({ detail }) => {
      if (prevAuth.value) {
        console.log('===== prevAuth.value =====', prevAuth.value)
        console.log('===== detail =====', detail)
        const event = determineAuthChangeEvent(prevAuth.value, detail)
        console.log('===== auth:change event =====', event)
        if (authEvent) {
          authEvent.value = event
        }
      }
      authState.value = detail

      if (detail.status === 200 && detail.meta?.access_token && detail.data.user) {
        await fetch()
      }

      prevAuth.value = detail
    })

    watch(
      () => authEvent.value,
      async (newVal, _oldVal) => {
        const auth = authState.value
        console.log('===== newVal =====', newVal)
        switch (newVal) {
          case AuthChangeEvent.LOGGED_OUT:
            console.log('====== 4 ======')
            await clear()
            return await nuxtApp.runWithContext(() => navigateTo({
              path: URLs.LOGOUT_REDIRECT_URL,
            }))
          case AuthChangeEvent.LOGGED_IN: {
            const route = useRouter().currentRoute.value
            console.log('====== 5 ======')
            const returnToPath = route.query.next?.toString()
            const isRedirectingToLogin = returnToPath === '/account/login'
            const redirectTo = isRedirectingToLogin ? URLs.LOGIN_REDIRECT_URL : returnToPath || URLs.LOGIN_REDIRECT_URL
            return await nuxtApp.runWithContext(() => navigateTo(redirectTo))
          }
          case AuthChangeEvent.REAUTHENTICATED: {
            const router = useRouter()
            const next = router.currentRoute.value.query.next
            if (next) {
              console.log('====== 6 ======')
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
                console.log('====== 7 ======')
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
            console.log('====== 10 ======')
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
