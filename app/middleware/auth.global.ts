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
      if (loggedIn.value || !isRouteProtected(routeName)) return
      console.info('Navigating to Home page due to unauthenticated route:', to.path)
      return nuxtApp.runWithContext(() => navigateTo(localePath('index')))
    }

    return await verifyAuthenticatedRoutes(to)
  },
)
