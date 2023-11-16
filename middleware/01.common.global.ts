export default defineNuxtRouteMiddleware((to, from) => {
	const config = useRuntimeConfig()
	const publicConfig = config.public

	if (to.path === publicConfig?.auth?.redirect?.login) {
		const { user } = useAuthSession()

		if (user.value) {
			const returnToPath = from.query.redirect?.toString()
			const redirectTo = returnToPath || publicConfig?.auth?.redirect?.home
			return navigateTo(redirectTo)
		}
	}
})
