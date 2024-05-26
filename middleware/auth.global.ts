import type { RouteLocationNormalized } from 'vue-router'
import { AuthenticatedRoutePrefixes, AuthenticatedRoutes } from '~/constants'

export default defineNuxtRouteMiddleware(
  async (to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
    const nuxtApp = useNuxtApp()
    const { loggedIn } = useUserSession()

    const verifyAuthenticatedRoutes = async (
      to: RouteLocationNormalized,
    ) => {
      if (loggedIn.value) return

      const isRouteProtected = AuthenticatedRoutePrefixes.some(prefix =>
        to.path.startsWith(prefix),
      ) || AuthenticatedRoutes.includes(to.path as typeof AuthenticatedRoutes[number])

      if (!isRouteProtected) return
      return nuxtApp.runWithContext(() => navigateTo('/'))
    }

    return await verifyAuthenticatedRoutes(to)
  },
)
