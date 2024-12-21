import { withQuery } from 'ufo'
import type { RouteNamedMapI18n } from 'vue-router/auto-routes'
import type { RouteLocationAsRelativeI18n } from 'vue-router'

export default defineNuxtPlugin({
  name: 'auth',
  parallel: true,
  async setup(nuxtApp) {
    const appStore = useAppStore()
    const { healthy } = storeToRefs(appStore)

    if (!healthy.value) {
      return
    }

    const { loggedIn, fetch, clear } = useUserSession()
    const authStore = useAuthStore()
    const userStore = useUserStore()
    const userNotificationStore = useUserNotificationStore()
    const { setupSessions, setupAuthenticators, clearAuthState } = authStore
    const { clearAccountState } = userStore
    const { setupNotifications } = userNotificationStore

    const authState = useState<AllAuthResponse | AllAuthResponseError>('auth-state')
    const authEvent = useState<AuthChangeEventType>('authEvent')

    const previousAuthState = ref<AllAuthResponse | AllAuthResponseError | null>(
      authState.value,
    )

    nuxtApp.hook('auth:change', async ({ detail: newAuthState }) => {
      authState.value = newAuthState
      authEvent.value = determineAuthChangeEvent(authState.value, previousAuthState.value)

      if (isAllAuthResponseSuccess(newAuthState) && newAuthState.meta?.is_authenticated) {
        console.debug('Authenticated')
        await fetch()
        if (!previousAuthState.value || (previousAuthState.value && isAllAuthResponseError(previousAuthState.value))) {
          console.debug('First time authenticated')
          await Promise.all([
            setupSessions(),
            setupAuthenticators(),
            setupNotifications(),
          ])
        }
      }

      previousAuthState.value = newAuthState
    })

    watch(
      () => [authEvent.value, authState.value],
      async ([authEventVal, _authStateVal]) => {
        switch (authEventVal) {
          case AuthChangeEvent.LOGGED_OUT:
            console.debug('Logged out')
            await handleLoggedOut()
            break
          case AuthChangeEvent.LOGGED_IN:
            console.debug('Logged in')
            await handleLoggedIn()
            break
          case AuthChangeEvent.REAUTHENTICATED:
            console.debug('Reauthenticated')
            await handleReauthenticated()
            break
          case AuthChangeEvent.REAUTHENTICATION_REQUIRED:
            console.debug('Reauthentication required')
            await handleReauthenticationRequired()
            break
          case AuthChangeEvent.FLOW_UPDATED:
            console.debug('Flow updated')
            await navigateToPendingFlow(authState.value)
            break
          default:
            console.debug('Unhandled auth event:', authEventVal)
            break
        }
      },
    )

    nuxtApp.provide('authState', authState)

    async function handleLoggedOut() {
      try {
        clearAuthState()
        clearAccountState()
        if (loggedIn.value) {
          console.debug('Logged out, clearing user session')
          await clear()
        }
        return await navigateToUrl(URLs.LOGIN_REDIRECT_URL)
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
        const isRedirectingToLogin = returnToPath === 'account-login'
        const redirectTo = isRedirectingToLogin || !returnToPath
          ? URLs.LOGIN_REDIRECT_URL
          : returnToPath
        return await navigateToUrl(redirectTo)
      }
      catch (error) {
        console.error('Error handling logged in:', error)
      }
    }

    async function handleReauthenticated() {
      try {
        const router = useRouter()
        const next = router.currentRoute.value.query.next as string | undefined
        return await navigateToUrl(next || URLs.LOGIN_REDIRECT_URL)
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
          console.debug('Reauthentication required, navigating to reauthentication flow')
          const url = withQuery(flowPath, { next })
          return await navigateToUrl(url)
        }
        else {
          console.warn('No reauthentication flow found')
        }
      }
      catch (error) {
        console.error('Error handling reauthentication required:', error)
      }
    }

    async function navigateToUrl(path: string, replace = true) {
      try {
        const localePath = useLocalePath()
        const url = localePath(path as keyof RouteNamedMapI18n | (Omit<RouteLocationAsRelativeI18n, 'path'> & { path?: string | undefined }))
        return await nuxtApp.runWithContext(() => navigateTo(url, { replace }))
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
