import type { RouteNamedMapI18n } from 'vue-router/auto-routes'

export default defineNuxtPlugin({
  name: 'auth',
  parallel: true,
  async setup(nuxtApp) {
    // Skip during build-time prerendering (no backend available)
    if (import.meta.server && useRequestHeaders()['x-nitro-prerender']) {
      return
    }

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
    const userInitiatedLogout = useState<boolean>('auth:userInitiatedLogout', () => false)

    const previousAuthState = ref<AllAuthResponse | AllAuthResponseError | null>(
      authState.value,
    )

    nuxtApp.hook('auth:change', async ({ detail: newAuthState }) => {
      authState.value = newAuthState
      authEvent.value = determineAuthChangeEvent(authState.value, previousAuthState.value)

      log.info('auth', 'State changed', { event: authEvent.value })

      if (isAllAuthResponseSuccess(newAuthState) && newAuthState.meta?.is_authenticated) {
        await fetch()
      }

      previousAuthState.value = newAuthState
    })

    watch(
      () => authEvent.value,
      async (authEventVal) => {
        switch (authEventVal) {
          case AuthChangeEvent.LOGGED_OUT:
            log.info('auth', 'Logged out')
            await handleLoggedOut()
            break
          case AuthChangeEvent.LOGGED_IN:
            log.info('auth', 'Logged in')
            await handleLoggedIn()
            break
          case AuthChangeEvent.REAUTHENTICATED:
            log.info('auth', 'Reauthenticated')
            await handleReauthenticated()
            break
          case AuthChangeEvent.REAUTHENTICATION_REQUIRED:
            log.info('auth', 'Reauthentication required')
            await handleReauthenticationRequired()
            break
          case AuthChangeEvent.FLOW_UPDATED:
            log.info('auth', 'Flow updated')
            await navigateToPendingFlow(authState.value)
            break
          default:
            log.info('auth', 'Unhandled auth event', { event: authEventVal })
            break
        }
      },
    )

    nuxtApp.provide('authState', authState)

    async function handleLoggedOut() {
      const wasExplicit = userInitiatedLogout.value
      userInitiatedLogout.value = false
      try {
        clearAuthState()
        clearAccountState()
        if (loggedIn.value) {
          log.info('auth', 'Clearing user session')
          await clear()
        }
        if (!wasExplicit && import.meta.client) {
          // Session was killed by the server (410/401) — surface it so the
          // user isn't silently redirected mid-task. Composables need the
          // Nuxt context from the plugin setup; the watcher that drives us
          // fires after hydration so wrap in runWithContext.
          try {
            nuxtApp.runWithContext(() => {
              const toast = useToast()
              const { t } = useI18n()
              toast.add({
                title: t('auth.session_expired_title'),
                description: t('auth.session_expired_description'),
                color: 'warning',
                icon: 'i-heroicons-lock-closed',
              })
            })
          }
          catch (toastError) {
            log.warn('auth', 'Failed to surface session-expired toast', { error: toastError })
          }
        }
        return await navigateToUrl({ path: RedirectToURLs.LOGOUT_REDIRECT_URL })
      }
      catch (error) {
        log.error({ action: 'auth:loggedOut', error })
      }
    }

    async function handleLoggedIn() {
      try {
        const router = useRouter()
        const route = router.currentRoute.value
        const localePath = useLocalePath()
        const returnToPath = route.query.next?.toString()
        const loginPath = localePath(RedirectToURLs.LOGIN_URL)
        const isRedirectingToLogin = returnToPath === RedirectToURLs.LOGIN_URL || returnToPath === loginPath
        const redirectTo = isRedirectingToLogin || !returnToPath
          ? RedirectToURLs.LOGIN_REDIRECT_URL
          : returnToPath as keyof RouteNamedMapI18n
        return await navigateToUrl({ path: redirectTo })
      }
      catch (error) {
        log.error({ action: 'auth:loggedIn', error })
      }
    }

    async function handleReauthenticated() {
      try {
        const router = useRouter()
        const next = router.currentRoute.value.query.next as keyof RouteNamedMapI18n
        return await navigateToUrl({ path: next || RedirectToURLs.LOGIN_REDIRECT_URL })
      }
      catch (error) {
        log.error({ action: 'auth:reauthenticated', error })
      }
    }

    async function handleReauthenticationRequired() {
      try {
        const next = useRouter().currentRoute.value.fullPath
        const flowPath = getReauthenticationFlowPath(authState.value)
        if (flowPath) {
          log.info('auth', 'Navigating to reauthentication flow')
          return await navigateToUrl({ path: flowPath, query: { next } })
        }
        else {
          log.warn('auth', 'No reauthentication flow found')
        }
      }
      catch (error) {
        log.error({ action: 'auth:reauthenticationRequired', error })
      }
    }

    async function navigateToUrl({ path, query, replace = false }: { path: keyof RouteNamedMapI18n, query?: Record<string, string>, replace?: boolean }) {
      try {
        const localePath = useLocalePath()
        const url = localePath(path)
        log.info('auth', 'Navigating to URL', { url })
        return nuxtApp.runWithContext(() => navigateTo({ path: url, query }, { replace }))
      }
      catch (error) {
        log.error({ action: 'auth:navigate', error })
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
