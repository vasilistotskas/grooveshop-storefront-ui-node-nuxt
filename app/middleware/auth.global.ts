import type { RouteLocationNormalized } from 'vue-router'

export default defineNuxtRouteMiddleware(
  async (to, _from) => {
    const nuxtApp = useNuxtApp()
    const { loggedIn } = useUserSession()
    const localePath = useLocalePath()

    const verifyAuthenticatedRoutes = async (
      to: RouteLocationNormalized,
    ) => {
      const routeName = nuxtApp.$routeBaseName(to)
      if (!routeName) return
      if (loggedIn.value || !isRouteProtected(String(routeName))) return
      return nuxtApp.runWithContext(() =>
        // The page's path, its query only where the page marks it view
        // state (`returnTarget`): a query can hold a token.
        navigateTo(localePath({ name: RedirectToURLs.LOGIN_URL, query: { next: returnTarget(to) } })),
      )
    }

    return await verifyAuthenticatedRoutes(to)
  },
)
