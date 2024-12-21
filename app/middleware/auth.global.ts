import type { RouteLocationNormalized } from 'vue-router'

export default defineNuxtRouteMiddleware(
  async (to, _from) => {
    const nuxtApp = useNuxtApp()
    const { loggedIn } = useUserSession()
    const localePath = useLocalePath()

    const verifyAuthenticatedRoutes = async (
      to: RouteLocationNormalized,
    ) => {
      if (loggedIn.value || !isRouteProtected(to.path)) return
      console.debug('Navigating to Home page due to unauthenticated route:', to.path)
      return await nuxtApp.runWithContext(() => navigateTo(localePath('index')))
    }

    return await verifyAuthenticatedRoutes(to)
  },
)
