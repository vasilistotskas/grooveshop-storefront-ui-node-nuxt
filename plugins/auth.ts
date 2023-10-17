export default defineNuxtPlugin(async (NuxtApp) => {
	try {
		const initialized = useState('auth-initialized', () => false)

		const idb = await useAsyncIDBKeyval('auth', false)
		const { _loggedIn, _totpActive, _totpAuthenticated } = useAuthSession()

		if (!initialized.value) {
			const { fetchUser } = useAuth()
			const { _refreshToken, _accessToken, _refresh } = useAuthSession()

			if (_accessToken.get()) {
				await fetchUser()
			} else {
				const isLoggedIn = _loggedIn.get() === 'true'

				if (isLoggedIn || _refreshToken.get()) {
					await _refresh()
					if (_accessToken.get()) {
						await fetchUser()
					}
				}
			}
		}

		initialized.value = true

		const { user } = useAuthSession()
		const loggedIn = useState<boolean>('auth-loggedIn')

		if (user.value) {
			_loggedIn.set(true)
			loggedIn.value = true
			idb.value = true
		} else {
			_loggedIn.set(false)
			_totpActive.set('false')
			_totpAuthenticated.set('false')
			loggedIn.value = false
			idb.value = false
		}
	} catch (e) {
		// eslint-disable-next-line no-console
		console.error('Something went wrong while initializing auth plugin', e)
	}
})
