import type { RouteNamedMapI18n } from 'vue-router/auto-routes'

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
    const { clearAuthState } = authStore
    const { clearAccountState } = userStore

    const authState = useState<AllAuthResponse | AllAuthResponseError>('auth-state')
    const authEvent = useState<AuthChangeEventType>('authEvent')

    const previousAuthState = ref<AllAuthResponse | AllAuthResponseError | null>(
      authState.value,
    )

    nuxtApp.hook('auth:change', async ({ detail: newAuthState }) => {
      authState.value = newAuthState
      authEvent.value = determineAuthChangeEvent(authState.value, previousAuthState.value)

      console.info('authState', authState.value)
      console.info('authEvent', authEvent.value)

      if (isAllAuthResponseSuccess(newAuthState) && newAuthState.meta?.is_authenticated) {
        console.info('Authenticated')
        await fetch()
      }

      previousAuthState.value = newAuthState
    })

    watch(
      () => [authEvent.value, authState.value],
      async ([authEventVal, _authStateVal]) => {
        switch (authEventVal) {
          case AuthChangeEvent.LOGGED_OUT:
            console.info('Logged out')
            await handleLoggedOut()
            break
          case AuthChangeEvent.LOGGED_IN:
            console.info('Logged in')
            await handleLoggedIn()
            break
          case AuthChangeEvent.REAUTHENTICATED:
            console.info('Reauthenticated')
            await handleReauthenticated()
            break
          case AuthChangeEvent.REAUTHENTICATION_REQUIRED:
            console.info('Reauthentication required')
            await handleReauthenticationRequired()
            break
          case AuthChangeEvent.FLOW_UPDATED:
            console.info('Flow updated')
            await navigateToPendingFlow(authState.value)
            break
          default:
            console.info('Unhandled auth event:', authEventVal)
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
          console.info('handleLoggedOut, clearing user session')
          await clear()
        }
        return await navigateToUrl({ path: URLs.LOGIN_REDIRECT_URL })
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
          : returnToPath as keyof RouteNamedMapI18n
        return await navigateToUrl({ path: redirectTo })
      }
      catch (error) {
        console.error('Error handling logged in:', error)
      }
    }

    async function handleReauthenticated() {
      try {
        const router = useRouter()
        const next = router.currentRoute.value.query.next as keyof RouteNamedMapI18n
        return await navigateToUrl({ path: next || URLs.LOGIN_REDIRECT_URL })
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
          console.info('Reauthentication required, navigating to reauthentication flow')
          return await navigateToUrl({ path: flowPath, query: { next } })
        }
        else {
          console.warn('No reauthentication flow found')
        }
      }
      catch (error) {
        console.error('Error handling reauthentication required:', error)
      }
    }

    async function navigateToUrl({ path, query, replace = false }: { path: keyof RouteNamedMapI18n, query?: Record<string, string>, replace?: boolean }) {
      try {
        const localePath = useLocalePath()
        const url = localePath(path)
        console.info('Navigating to URL:', url)
        return nuxtApp.runWithContext(() => navigateTo({ path: url, query }, { replace }))
      }
      catch (error) {
        console.error('Error navigating to URL:', error)
      }
    }

    function getReauthenticationFlowPath(auth: AllAuthResponse | AllAuthResponseError) {
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
