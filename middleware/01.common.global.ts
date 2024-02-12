export default defineNuxtRouteMiddleware((to, from) => {
	const config = useRuntimeConfig()
	const publicConfig = config.public
	const jwtAuth = useCookie('jwt_auth')
	const { isAuthenticated, _loggedIn } = useAuthSession()
	const { user } = useAuthSession()

	if (isAuthenticated.value && !jwtAuth.value) {
		user.value = null
		_loggedIn.set(false)
		return navigateTo(publicConfig?.auth?.redirect?.login)
	}

	if (to.path === publicConfig?.auth?.redirect?.login) {
		const { user } = useAuthSession()

		if (user.value) {
			const returnToPath = from.query.redirect?.toString()

			if (returnToPath === publicConfig?.auth?.redirect?.login) {
				return navigateTo(publicConfig?.auth?.redirect?.home)
			}

			const redirectTo = returnToPath || publicConfig?.auth?.redirect?.home
			return navigateTo(redirectTo)
		}
	}
})
