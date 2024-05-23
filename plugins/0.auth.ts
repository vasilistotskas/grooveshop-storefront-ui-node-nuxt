import type { AllAuthResponse, AllAuthResponseError, AuthChangeEventType } from '~/types/all-auth'
import { AuthChangeEvent, URLs } from '~/types/all-auth'

export default defineNuxtPlugin({
  name: 'auth',
  parallel: true,
  async setup(nuxtApp) {
    const authState = useState<AllAuthResponse | AllAuthResponseError>('authState')
    const authEvent = useState<AuthChangeEventType>('authEvent')

    const prevAuth = ref(authState.value)

    nuxtApp.hook('auth:change', ({ detail }) => {
      if (prevAuth.value) {
        const event = determineAuthChangeEvent(prevAuth.value, detail)
        console.log('===== auth:change event =====', event)
        if (authEvent) {
          authEvent.value = event
        }
      }
      prevAuth.value = authState.value
      authState.value = detail
    })

    watch(
      () => authEvent.value,
      async (newVal, _oldVal) => {
        const auth = authState.value
        switch (newVal) {
          case AuthChangeEvent.LOGGED_OUT:
            return nuxtApp.runWithContext(() => navigateTo({
              path: URLs.LOGOUT_REDIRECT_URL,
            }))
          case AuthChangeEvent.LOGGED_IN:
            return nuxtApp.runWithContext(() => navigateTo({
              path: URLs.LOGIN_REDIRECT_URL,
            }))
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
              const flowId = auth.data.flows?.[0].id
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
            const pendingFlow = navigateToPendingFlow(auth)
            if (!pendingFlow) {
              throw createError({
                statusCode: 500,
                statusMessage: 'Flow updated, but no pending flow found',
                data: auth,
              })
            }
            return pendingFlow
          }
          default:
            break
        }
      },
    )

    nuxtApp.provide('authState', authState)
  },
})
