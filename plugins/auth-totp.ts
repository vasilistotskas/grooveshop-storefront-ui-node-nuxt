export default defineNuxtPlugin(async (NuxtApp) => {
	try {
		const totpInitialized = useState('auth-totp-initialized', () => false)

		const { isAuthenticated } = useAuthSession()
		const { _totpActive } = useAuthSession()
		const { totpActive } = useAuthMfa()

		if (isAuthenticated.value && !totpInitialized.value) {
			const { data, error } = await totpActive()

			if (!error.value && data.value?.active) {
				_totpActive.set('true')
			} else {
				_totpActive.set('false')
			}
		}
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('Something went wrong while initializing auth-totp plugin', e)
	}
})
