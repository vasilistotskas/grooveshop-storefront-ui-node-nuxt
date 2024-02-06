import { parseBoolean } from '~/utils/boolean'

export default defineNuxtRouteMiddleware((to) => {
	const config = useRuntimeConfig()
	const publicConfig = config.public

	const { _totpAuthenticated } = useAuthSession()

	const isTotpAuthenticated = parseBoolean(_totpAuthenticated.get())

	if (!isTotpAuthenticated) {
		return navigateTo({
			path: publicConfig?.auth?.redirect?.login,
			query: { redirect: to.path }
		})
	}
})
