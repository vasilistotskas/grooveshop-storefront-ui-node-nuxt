import type { RouteLocationNormalized } from 'vue-router'

import { AuthenticatedRoutePrefixes } from '~/constants/general'

export default defineNuxtRouteMiddleware(
	async (to: RouteLocationNormalized, from: RouteLocationNormalized) => {
		const { fetch } = useUserSession()
		const isLoginPage = (to: RouteLocationNormalized) => to.path === '/auth/login'

		const handleLoggedInUserRedirection = (from: RouteLocationNormalized) => {
			const { loggedIn } = useUserSession()
			if (!loggedIn.value) return

			const returnToPath = from.query.redirect?.toString()
			const isRedirectingToLogin = returnToPath === '/auth/login'
			const redirectTo = isRedirectingToLogin ? '/' : returnToPath || '/'
			return navigateTo(redirectTo)
		}

		const verifyTokenForAuthenticatedRoutes = async (to: RouteLocationNormalized) => {
			const { loggedIn, session } = useUserSession()
			const { tokenVerify } = useAuth()

			const isRouteAuthenticated = AuthenticatedRoutePrefixes.some((prefix) =>
				to.path.startsWith(prefix)
			)

			if (!isRouteAuthenticated) return

			if (!loggedIn.value) {
				return navigateTo({
					path: '/auth/login',
					query: { redirect: to.path }
				})
			}

			await tokenVerify({ token: session.value.token || '' })
			await fetch()
		}

		if (isLoginPage(to)) {
			return handleLoggedInUserRedirection(from)
		}

		return await verifyTokenForAuthenticatedRoutes(to)
	}
)
