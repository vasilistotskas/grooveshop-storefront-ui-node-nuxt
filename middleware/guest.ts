export default defineNuxtRouteMiddleware((to) => {
	const config = useRuntimeConfig()
	const publicConfig = config.public.auth

	if (to.path === publicConfig.redirect.login) {
		return
	}

	const { user } = useAuthSession()

	if (user.value) {
		return navigateTo(publicConfig.redirect.home)
	}
})
