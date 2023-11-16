export default defineNuxtRouteMiddleware((to) => {
	const config = useRuntimeConfig()
	const publicConfig = config.public

	const { _totpAuthenticated } = useAuthSession()

	const isTotpAuthenticated = _totpAuthenticated.get() === 'true'

	if (!isTotpAuthenticated) {
		return navigateTo({
			path: publicConfig?.auth?.redirect?.login,
			query: { redirect: to.path }
		})
	}
})
