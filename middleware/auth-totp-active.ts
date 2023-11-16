export default defineNuxtRouteMiddleware((to) => {
	const config = useRuntimeConfig()
	const publicConfig = config.public

	const { _totpActive } = useAuthSession()

	const isTotpActive = _totpActive.get() === 'true'

	if (!isTotpActive) {
		return navigateTo({
			path: publicConfig?.auth?.redirect?.mfa?.totp?.activate,
			query: { redirect: to.path }
		})
	}
})
