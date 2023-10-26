export default defineNuxtPlugin(async (NuxtApp) => {
	try {
		const initialized = useState('session-initialized', () => false)
		const { _refreshSession } = useAuthSession()

		if (!initialized.value) {
			await _refreshSession()
		}

		initialized.value = true
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('Something went wrong while initializing session server plugin', e)
	}
})
