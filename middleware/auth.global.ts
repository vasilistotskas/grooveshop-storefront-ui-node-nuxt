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

      const returnToPath = from.query.redirect?.toString()
      const isRedirectingToLogin = returnToPath === '/account/login'
      const redirectTo = isRedirectingToLogin ? '/' : returnToPath || '/'
      return nuxtApp.runWithContext(() => navigateTo(redirectTo))
    }

    const verifyAuthenticatedRoutes = async (
      to: RouteLocationNormalized,
    ) => {
      const { loggedIn } = useUserSession()

      const isRouteProtected = AuthenticatedRoutePrefixes.some(prefix =>
        to.path.startsWith(prefix),
      ) || AuthenticatedRoutes.includes(to.path as typeof AuthenticatedRoutes[number])

      if (!isRouteProtected) return

      if (!loggedIn.value) {
        return nuxtApp.runWithContext(() => navigateTo({
          path: '/account/login',
          query: { redirect: to.path },
        }))
      }
    }

    if (isLoginPage(to)) {
      return handleLoggedInUserRedirection(from)
    }

    return await verifyAuthenticatedRoutes(to)
  },
)
