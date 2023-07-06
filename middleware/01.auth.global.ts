import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware(async (to, from) => {
	const authStore = useAuthStore()
	const userStore = useUserStore()

	try {
		await authStore.fetchAuth()
	} catch (error) {
		//
	}

	if (
		(!authStore.isAuthenticated || !userStore.account?.isSuperuser) &&
		to.path === '/admin'
	) {
		return navigateTo('/')
	}

	if (!authStore.isAuthenticated && to.meta.layout === 'user') {
		return navigateTo('/')
	}

	if (process.env.NODE_ENV !== 'development' && to.meta.layout === 'testing') {
		return navigateTo('/')
	}
})
