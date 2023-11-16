export default defineNuxtRouteMiddleware((to) => {
	const config = useRuntimeConfig()
	const publicConfig = config.public

	if (to.path === publicConfig?.auth?.redirect?.login) {
		return
	}

	if (publicConfig.enableGlobalAuthMiddleware === true) {
		if (to.meta.auth === false) {
			return
		}
	}

	const { user } = useAuthSession()

	if (!user.value) {
		return navigateTo({
			path: publicConfig?.auth?.redirect?.login,
			query: { redirect: to.path }
		})
	}
})
