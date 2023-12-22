export default defineNuxtPlugin(async (NuxtApp) => {
	if (process.prerender) {
		return
	}
	const initialized = useState('auth-initialized', () => false)

	const idb = await useAsyncIDBKeyval('auth', false)

	const { _loggedIn, _totpActive, _totpAuthenticated } = useAuthSession()

	if (!initialized.value) {
		const { fetchUser } = useAuth()
		const userStore = useUserStore()
		const { fetchAccount } = userStore
		const { _refreshToken, _accessToken, _refresh } = useAuthSession()

		if (_accessToken.get()) {
			try {
				await fetchUser()
				await fetchAccount()
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(e)
				return
			}
		} else {
			const isLoggedIn = _loggedIn.get()

			if (isLoggedIn || _refreshToken.get()) {
				try {
					await _refresh()
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error(e)
					return
				}
				if (_accessToken.get()) {
					try {
						await fetchUser()
					} catch (e) {
						// eslint-disable-next-line no-console
						console.error(e)
						return
					}
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
})
