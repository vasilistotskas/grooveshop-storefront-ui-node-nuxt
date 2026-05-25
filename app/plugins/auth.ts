import type { Composer } from 'vue-i18n'
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

    const { fetch, clear } = useUserSession()
    const authStore = useAuthStore()
    const userStore = useUserStore()
    const userNotificationStore = useUserNotificationStore()
    const { clearAuthState } = authStore
    const { clearAccountState } = userStore
    const { clearNotificationsState } = userNotificationStore

    const authState = useState<AllAuthResponse | AllAuthResponseError>('auth-state')
    const authEvent = useState<AuthChangeEventType>('authEvent')
    // Set inside the auth:change hook from `explicit` — not by the calling component — so the flag is always visible to the watcher that reads it.
    const userInitiatedLogout = useState<boolean>('auth:userInitiatedLogout', () => false)

    const previousAuthState = ref<AllAuthResponse | AllAuthResponseError | null>(
      authState.value,
    )

    nuxtApp.hook('auth:change', async ({ detail: newAuthState, explicit }) => {
      authState.value = newAuthState

      // Sync nuxt-auth-utils' `loggedIn` ref from the server BEFORE
      // dispatching the navigation handler. Otherwise the route-change
      // handler (auth.global.ts) reads a stale `loggedIn` and bounces
      // a freshly-logged-in user to /account/login?next=/account.
      if (isAllAuthResponseSuccess(newAuthState) && newAuthState.meta?.is_authenticated) {
        await fetch()
      }

      const newEvent = determineAuthChangeEvent(authState.value, previousAuthState.value)
      previousAuthState.value = newAuthState

      if (newEvent === null) {
        // Equivalent steady state — nothing actionable. Don't write to
        // authEvent (avoids "Unhandled auth event" log spam on every
        // page load when SSR carried LOGGED_IN over and the client's
        // setupSession reconciles identical state).
        return
      }

      authEvent.value = newEvent

      if (explicit && newEvent === AuthChangeEvent.LOGGED_OUT) {
        userInitiatedLogout.value = true
      }

      log.info('auth', 'State changed', { event: newEvent, explicit: !!explicit })

      // Dispatch directly inside the hook body — NOT via watch(authEvent).
      // Vue's `watch` collapses consecutive equal values, so two same-event
      // dispatches in quick succession (e.g. WebAuthn signup: GET options
      // → PUT credential → POST signup, where intermediate steps may emit
      // identical FLOW_UPDATED events) would silently drop the second
      // navigation. Dispatching in the hook body fires every time.
      switch (newEvent) {
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
      }
    })

    nuxtApp.provide('authState', authState)

    async function handleLoggedOut() {
      const wasExplicit = userInitiatedLogout.value
      userInitiatedLogout.value = false
      try {
        clearAuthState()
        clearAccountState()
        clearNotificationsState()
        // No `loggedIn.value` guard — when this fires from a server-driven
        // 410, the session.delete.ts finally block has already cleared
        // the server cookie, but the client `loggedIn` ref may not have
        // synced yet. `clear()` is idempotent, so calling it unconditionally
        // is safe and ensures the client state catches up.
        log.info('auth', 'Clearing user session')
        await clear()
        if (!wasExplicit && import.meta.client) {
          // Session was killed by the server (410/401) — surface it so the
          // user isn't silently redirected mid-task. Composables need the
          // Nuxt context from the plugin setup; the watcher that drives us
          // fires after hydration so wrap in runWithContext.
          try {
            nuxtApp.runWithContext(() => {
              const toast = useToast()
              const { t } = nuxtApp.$i18n as Composer
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
        const rawNext = route.query.next?.toString()
        const returnToPath = isSafeRelativePath(rawNext) ? rawNext : undefined
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
        const rawNext = router.currentRoute.value.query.next?.toString()
        const safeNext = isSafeRelativePath(rawNext) ? rawNext as keyof RouteNamedMapI18n : undefined
        return await navigateToUrl({ path: safeNext || RedirectToURLs.LOGIN_REDIRECT_URL })
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
