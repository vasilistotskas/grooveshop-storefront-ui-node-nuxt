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
        navigateTo(localePath({ name: RedirectToURLs.LOGIN_URL, query: { next: to.fullPath } })),
      )
    }

    return await verifyAuthenticatedRoutes(to)
  },
)
