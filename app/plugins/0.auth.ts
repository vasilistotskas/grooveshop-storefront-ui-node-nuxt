import { withQuery } from 'ufo'
import type {
  AllAuthResponse,
  AllAuthResponseError,
  AuthChangeEventType,
} from '~/types/all-auth'
import { AuthChangeEvent, Flow2path, URLs } from '~/types/all-auth'

export default defineNuxtPlugin({
  name: 'auth',
  parallel: true,
  async setup(nuxtApp) {
    const { fetch, loggedIn, clear } = useUserSession()
    const authStore = useAuthStore()
    const { setupSession, clearSession } = authStore
    const userStore = useUserStore()
    const { cleanAccountState } = userStore

    const authState = useState<AllAuthResponse | AllAuthResponseError>('authState')
    const authEvent = useState<AuthChangeEventType>('authEvent')

    const previousAuthState = ref<AllAuthResponse | AllAuthResponseError | null>(
      authState.value,
    )

    await setupSession()

    nuxtApp.hook('auth:change', ({ detail: newAuthState }) => {
      console.log('Auth state:', newAuthState)
      authState.value = newAuthState
      authEvent.value = determineAuthChangeEvent(authState.value, previousAuthState.value)
      console.log('Auth event 1:', authEvent.value)
      previousAuthState.value = newAuthState
    })

    watch(
      () => [authEvent.value, authState.value],
      async ([authEventVal, _authStateVal]) => {
        console.log('Auth event 2:', authEventVal)

        switch (authEventVal) {
          case AuthChangeEvent.LOGGED_OUT:
            await handleLoggedOut()
            break
          case AuthChangeEvent.LOGGED_IN:
            await handleLoggedIn()
            break
          case AuthChangeEvent.REAUTHENTICATED:
            await handleReauthenticated()
            break
          case AuthChangeEvent.REAUTHENTICATION_REQUIRED:
            await handleReauthenticationRequired()
            break
          case AuthChangeEvent.FLOW_UPDATED:
            await navigateToPendingFlow(authState.value)
            break
          default:
            break
        }
      },
    )

    nuxtApp.provide('authState', authState)

    async function handleLoggedOut() {
      try {
        clearSession()
        cleanAccountState()
        console.log('Logged out', loggedIn.value)
        if (loggedIn.value) {
          await clear()
        }
        return navigateToUrl(URLs.LOGIN_REDIRECT_URL)
      }
      catch (error) {
        console.error('Error handling logged out:', error)
      }
    }

    async function handleLoggedIn() {
      try {
        const router = useRouter()
        const route = router.currentRoute.value
        const returnToPath = route.query.next?.toString()
        const isRedirectingToLogin = returnToPath === '/account/login'
        const redirectTo = isRedirectingToLogin || !returnToPath
          ? URLs.LOGIN_REDIRECT_URL
          : returnToPath
        await fetch()
        return navigateToUrl(redirectTo)
      }
      catch (error) {
        console.error('Error handling logged in:', error)
      }
    }

    async function handleReauthenticated() {
      try {
        const router = useRouter()
        const next = router.currentRoute.value.query.next as string | undefined
        return navigateToUrl(next || URLs.LOGIN_REDIRECT_URL)
      }
      catch (error) {
        console.error('Error handling reauthenticated:', error)
      }
    }

    async function handleReauthenticationRequired() {
      try {
        const next = useRouter().currentRoute.value.fullPath
        const flowPath = getReauthenticationFlowPath(authState.value)
        if (flowPath) {
          const url = withQuery(flowPath, { next })
          return navigateToUrl(url)
        }
        else {
          console.warn('No reauthentication flow found')
        }
      }
      catch (error) {
        console.error('Error handling reauthentication required:', error)
      }
    }

    function navigateToUrl(path: string) {
      try {
        const localePath = useLocalePath()
        const url = localePath(path)
        console.log('========== navigateToUrl ==========')
        return nuxtApp.runWithContext(() => navigateTo(url))
      }
      catch (error) {
        console.error('Error navigating to URL:', error)
      }
    }

    function getReauthenticationFlowPath(auth: AllAuthResponse | AllAuthResponseError): string | null {
      if ('data' in auth && auth.data?.flows) {
        const pendingFlow = auth.data.flows.find(flow => flow.is_pending)
        if (pendingFlow) {
          return pathForFlow(pendingFlow)
        }
        const reauthenticateFlowExists = auth.data.flows.some(flow => flow.id === 'reauthenticate')
        if (reauthenticateFlowExists) {
          return Flow2path['reauthenticate']
        }
      }
      return null
    }
  },
})
