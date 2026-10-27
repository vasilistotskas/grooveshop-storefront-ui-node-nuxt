export default defineNuxtPlugin({
  name: 'setup',
  parallel: true,
  dependsOn: ['auth'],
  async setup(nuxtApp) {
    // Skip API calls during build-time prerendering (no backend available)
    // import.meta.prerender is replaced at build time; the
    // x-nitro-prerender header it replaces here is client-supplied, so
    // a visitor could send it and skip session/cart bootstrap.
    if (import.meta.prerender) {
      return
    }

    // Cached SSR renders (Nitro swr route rules — the routes in
    // shared/constants/prerender.ts) MUST stay anonymous: the payload of
    // this render is replayed to every visitor for the cache lifetime,
    // so fetching the triggering visitor's session/account/CART here
    // would bake their data into shared HTML. ``event.context.cache`` is
    // the same signal nuxt-auth-utils uses to skip its session fetch
    // (and to set ``payload.isCached``). setupCart is the concrete leak:
    // it forwards the request cookies and has no loggedIn guard, so even
    // a guest's cart would be cached (found in the 2026-08-28 SWR audit).
    if (import.meta.server && useRequestEvent()?.context?.cache) {
      return
    }

    const { loggedIn } = useUserSession()
    const userStore = useUserStore()
    const { setupAccount } = userStore
    const cartStore = useCartStore()
    const { setupCart, cleanCartState } = cartStore
    const authStore = useAuthStore()
    const { setupConfig, setupSession, setupSessions, setupAuthenticators } = authStore
    const userNotificationStore = useUserNotificationStore()
    const { setupNotifications } = userNotificationStore
    const { syncFromUser: syncLanguageFromUser } = useUserLanguage()

    // Pages served from Nitro's cache (payload.isCached — see the server
    // guard above) or build-time prerender hydrate against ANONYMOUS
    // markup, so nothing user-specific may load before hydration or the
    // client vdom diverges from the SSR DOM. nuxt-auth-utils re-fetches
    // the session on app:suspense:resolve (its hook registers first and
    // hooks run serially, so ``loggedIn`` is accurate here); the
    // loggedIn watcher below then restores account/cart/sessions for
    // logged-in users. Only two things fall through the cracks and are
    // done explicitly: the allauth config (needed by auth UI regardless)
    // and GUEST carts (cookie-bound, no loggedIn flip to trigger the
    // watcher).
    const registerLoggedInWatcher = () => {
      watch(loggedIn, async (value, oldValue) => {
        if (value === oldValue) return
        if (value) {
          await setupSession()

          await Promise.allSettled([
            setupAccount(),
            setupSessions(),
            setupAuthenticators(),
            setupNotifications(),
          ])
          await setupCart()
          await syncLanguageFromUser()
        }
        else {
          await cleanCartState()
        }
      }, { immediate: false })
    }

    const hydratesAnonymousMarkup = nuxtApp.payload.serverRendered
      && (Boolean(nuxtApp.payload.isCached) || Boolean(nuxtApp.payload.prerenderedAt))
    if (import.meta.client && hydratesAnonymousMarkup) {
      nuxtApp.hook('app:suspense:resolve', async () => {
        try {
          await setupConfig()
          if (!loggedIn.value) {
            await setupCart()
          }
        }
        catch (error) {
          log.error({ action: 'setup:cached-page-restore:failed', error })
        }
      })

      registerLoggedInWatcher()
      return
    }

    try {
      // Critical for SSR: config and session in parallel (both needed for initial render)
      await Promise.all([
        setupConfig(),
        setupSession(),
      ])

      // Cart and account needed for header UI during SSR
      await Promise.all([
        setupAccount(),
        setupCart(),
      ])

      // Backend is the source of truth for the user's language. Reconcile
      // the UI locale with `user.languageCode` so the switcher and every
      // rendered email agree, even if the i18n cookie disagreed (fresh
      // browser, different device, cookie cleared). Deferred to the client
      // so prerender / anonymous SSR — where `loggedIn` is always false and
      // calling setLocale() on a not-fully-wired i18n instance could
      // explode — never runs it.
      if (import.meta.client) {
        await syncLanguageFromUser()
      }

      // Defer non-critical data to client-side only (not needed for initial render)
      // Sessions list, authenticators, notifications can load after hydration.
      //
      // ``Promise.allSettled`` (not ``Promise.all``) so one failing
      // call — e.g. an expired session token causing ``setupSessions``
      // to 401 — doesn't cancel the other two. Before this change a
      // single bad call silently left the notification bell empty even
      // though the /user/account/{id}/notifications endpoint returned
      // data fine.
      if (import.meta.client) {
        const scheduleIdle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1))
        scheduleIdle(() => {
          Promise.allSettled([
            setupSessions(),
            setupAuthenticators(),
            setupNotifications(),
          ]).then((results) => {
            results.forEach((r, i) => {
              if (r.status === 'rejected') {
                const name = ['setupSessions', 'setupAuthenticators', 'setupNotifications'][i]
                log.warn({ tag: 'setup', message: `deferred ${name} failed`, error: r.reason })
              }
            })
          })
        }, { timeout: 2000 })
      }
    }
    catch (error) {
      log.error({ action: 'setup:failed', error })
    }

    registerLoggedInWatcher()
  },
})
