export default defineNuxtRouteMiddleware((to) => {
	const config = useRuntimeConfig()
	const publicConfig = config.public

	const { _totpActive } = useAuthSession()
	const isTotpActive = _totpActive.get()

	if (isTotpActive) {
		return navigateTo({
			path: publicConfig?.auth?.redirect?.home,
			query: { redirect: to.path }
		})
	}
})
