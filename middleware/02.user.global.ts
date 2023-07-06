import { useAuthStore } from '~/stores/auth'
import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware(async () => {
	const authStore = useAuthStore()
	const userStore = useUserStore()
	const account = userStore.account
	const isAuthenticated = authStore.isAuthenticated

	if (isAuthenticated && !account) {
		await userStore
			.fetchAccount()
			.then(() => {
				// console.log('========== account fetched ==========')
			})
			.catch(() => {
				// console.log(error)
			})
	}
})
