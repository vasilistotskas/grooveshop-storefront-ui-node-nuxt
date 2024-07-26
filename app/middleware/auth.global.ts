import type { RouteLocationNormalized } from 'vue-router'

export default defineNuxtRouteMiddleware(
  async (to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
    const nuxtApp = useNuxtApp()
    const { loggedIn } = useUserSession()
    const localePath = useLocalePath()

    const verifyAuthenticatedRoutes = async (
      to: RouteLocationNormalized,
    ) => {
      if (loggedIn.value || !isRouteProtected(to.path)) return
      return nuxtApp.runWithContext(() => navigateTo(localePath('/')))
    }

    return await verifyAuthenticatedRoutes(to)
  },
)
