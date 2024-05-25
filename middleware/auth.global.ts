import type { RouteLocationNormalized } from 'vue-router'
import { AuthenticatedRoutePrefixes, AuthenticatedRoutes } from '~/constants'

export default defineNuxtRouteMiddleware(
  async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    const nuxtApp = useNuxtApp()

    const isLoginPage = (to: RouteLocationNormalized) =>
      to.path === '/account/login'

    const handleLoggedInUserRedirection = (from: RouteLocationNormalized) => {
      const { loggedIn } = useUserSession()
      if (!loggedIn.value) return

      const returnToPath = from.query.next?.toString()
      const isRedirectingToLogin = returnToPath === '/account/login'
      const redirectTo = isRedirectingToLogin ? '/' : returnToPath || '/'
      console.log('====== 1 ======')
      return nuxtApp.runWithContext(() => navigateTo(redirectTo))
    }

    const verifyAuthenticatedRoutes = async (
      to: RouteLocationNormalized,
    ) => {
      const isRouteProtected = AuthenticatedRoutePrefixes.some(prefix =>
        to.path.startsWith(prefix),
      ) || AuthenticatedRoutes.includes(to.path as typeof AuthenticatedRoutes[number])

      if (!isRouteProtected) return
    }

    if (isLoginPage(to)) {
      return handleLoggedInUserRedirection(from)
    }

    return await verifyAuthenticatedRoutes(to)
  },
)
