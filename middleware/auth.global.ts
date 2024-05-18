import type { RouteLocationNormalized } from 'vue-router'
import { AuthenticatedRoutePrefixes } from '~/constants'

export default defineNuxtRouteMiddleware(
  async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
    const { fetch } = useUserSession()
    const isLoginPage = (to: RouteLocationNormalized) =>
      to.path === '/auth/login'

    const handleLoggedInUserRedirection = (from: RouteLocationNormalized) => {
      const { loggedIn } = useUserSession()
      if (!loggedIn.value) return

      const returnToPath = from.query.redirect?.toString()
      const isRedirectingToLogin = returnToPath === '/auth/login'
      const redirectTo = isRedirectingToLogin ? '/' : returnToPath || '/'
      return navigateTo(redirectTo)
    }

    const verifyAuthenticatedRoutes = async (
      to: RouteLocationNormalized,
    ) => {
      const { loggedIn } = useUserSession()
      const { getSession } = useAllAuthAuthentication()

      const isRouteProtected = AuthenticatedRoutePrefixes.some(prefix =>
        to.path.startsWith(prefix),
      )

      if (!isRouteProtected) return

      if (!loggedIn.value) {
        return navigateTo({
          path: '/auth/login',
          query: { redirect: to.path },
        })
      }

      try {
        await getSession()
        await fetch()
      }
      catch (error) {
        console.log('error', error)
        throw error
      }
    }

    if (isLoginPage(to)) {
      return handleLoggedInUserRedirection(from)
    }

    return await verifyAuthenticatedRoutes(to)
  },
)
