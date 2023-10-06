export default defineNuxtRouteMiddleware(async () => {
	const { isAuthenticated } = useAuthSession()

	const userStore = useUserStore()

	if (isAuthenticated.value && !userStore.account) {
		await userStore.fetchAccount()
	}
})
