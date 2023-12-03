import { resolveURL, withQuery } from 'ufo'
import type {
	LoginResponse,
	LogoutResponse,
	PasswordChangeBody,
	PasswordChangeResponse,
	PasswordResetConfirmResponse,
	PasswordResetResponse,
	RegistrationResendEmailBody,
	RegistrationResendEmailResponse,
	RegistrationResponse,
	RegistrationVerifyEmailBody,
	RegistrationVerifyEmailResponse,
	SocialAccountDisconnectResponse,
	SocialAccountResponse,
	TokenRefreshBody,
	TokenRefreshResponse,
	TokenVerifyResponse,
	User,
	IsUserRegisteredBody,
	LoginBody,
	PasswordResetBody,
	PasswordResetConfirmBody,
	RegistrationBody,
	SocialAccountDisconnectBody,
	TokenVerifyBody
} from '~/types/auth'

export default function () {
	const { user } = useAuthSession()
	const config = useRuntimeConfig()
	const publicConfig = config.public
	const {
		_accessToken,
		_refreshToken,
		_session,
		_csrftoken,
		_loggedIn,
		_totpActive,
		_totpAuthenticated
	} = useAuthSession()

	/**
	 * Login with email/password
	 */
	async function login(body: LoginBody) {
		const route = useRoute()

		const { data, pending, error, refresh } = await useFetch<LoginResponse>(
			'/api/auth/login',
			{
				key: 'login',
				method: 'POST',
				body
			}
		)
		if (!error.value && data.value) {
			const returnToPath = route.query.redirect?.toString()
			const redirectTo = returnToPath || publicConfig?.auth?.redirect?.home

			// A workaround to insure access token cookie is set
			_accessToken.set(data.value.access)
			_loggedIn.set(true)

			setTimeout(async () => {
				await fetchUser()
				const loggedIn = useState<boolean>('auth-loggedIn')
				loggedIn.value = true
				await navigateTo(redirectTo)
			}, 100)
		}

		return { data, pending, error, refresh }
	}

	/**
	 * Login via oauth provider
	 */
	function loginWithProvider(provider: string): void {
		if (process.client) {
			const route = useRoute()

			// The protected page the user has visited before redirect to login page
			const returnToPath = route.query.redirect?.toString()

			let redirectUrl = resolveURL('/api/auth/login', provider)

			redirectUrl = withQuery(redirectUrl, { redirect: returnToPath })

			window.location.replace(redirectUrl)
		}
	}

	/**
	 * Fetch active user, usefull to update `user` state
	 */
	async function fetchUser(): Promise<void> {
		try {
			const { getAccessToken } = useAuthSession()
			const accessToken = await getAccessToken()

			if (!accessToken) {
				user.value = null
				return
			}

			const response = await useFetch<User>('/api/auth/user', {
				method: 'GET'
			})
			user.value = response.data.value
		} catch (e) {
			user.value = null
			// eslint-disable-next-line no-console
			console.error('Error while fetching user', e)
		}
	}

	async function logout() {
		const loggedIn = useState<boolean>('auth-loggedIn')
		loggedIn.value = false

		const { data, pending, error, refresh } = await useFetch<LogoutResponse>(
			'/api/auth/logout',
			{
				method: 'POST',
				body: {}
			}
		)

		_accessToken.clear()
		_refreshToken.clear()
		_session.clear()
		_csrftoken.clear()
		_loggedIn.set(false)
		_totpActive.set('false')
		_totpAuthenticated.set('false')
		user.value = null

		clearNuxtData()
		await navigateTo(publicConfig?.auth?.redirect?.logout)

		return { data, pending, error, refresh }
	}

	async function register(body: RegistrationBody) {
		const route = useRoute()

		const { data, pending, error, refresh } = await useFetch<RegistrationResponse>(
			'/api/auth/registration',
			{
				key: 'register',
				method: 'POST',
				body
			}
		)
		if (!error.value && data.value && data.value.access) {
			const returnToPath = route.query.redirect?.toString()
			const redirectTo = returnToPath || publicConfig?.auth?.redirect?.home

			// A workaround to insure access token cookie is set
			_accessToken.set(data.value.access)
			_loggedIn.set(true)

			setTimeout(async () => {
				await fetchUser()
				const loggedIn = useState<boolean>('auth-loggedIn')
				loggedIn.value = true
				await navigateTo(redirectTo)
			}, 100)
		}
		return { data, pending, error, refresh }
	}

	async function passwordReset(body: PasswordResetBody) {
		const { data, pending, error, refresh } = await useFetch<PasswordResetResponse>(
			'/api/auth/password/reset',
			{
				method: 'POST',
				body
			}
		)
		return { data, pending, error, refresh }
	}

	async function passwordResetConfirm(body: PasswordResetConfirmBody) {
		const { data, pending, error, refresh } =
			await useFetch<PasswordResetConfirmResponse>('/api/auth/password/reset/confirm', {
				method: 'POST',
				body
			})
		return { data, pending, error, refresh }
	}

	async function passwordChange(body: PasswordChangeBody) {
		const { data, pending, error, refresh } = await useFetch<PasswordChangeResponse>(
			'/api/auth/password/change',
			{
				method: 'POST',
				body
			}
		)
		return { data, pending, error, refresh }
	}

	async function registrationResendEmail(body: RegistrationResendEmailBody) {
		const { data, pending, error, refresh } =
			await useFetch<RegistrationResendEmailResponse>(
				'/api/auth/registration/resend-email/',
				{
					method: 'POST',
					body
				}
			)
		return { data, pending, error, refresh }
	}

	async function registrationVerifyEmail(body: RegistrationVerifyEmailBody) {
		const { data, pending, error, refresh } =
			await useFetch<RegistrationVerifyEmailResponse>(
				'/api/auth/registration/verify-email/',
				{
					method: 'POST',
					body
				}
			)
		return { data, pending, error, refresh }
	}

	async function tokenVerify(body: TokenVerifyBody) {
		const { data, pending, error, refresh } = await useFetch<TokenVerifyResponse>(
			'/api/auth/token/verify/',
			{
				method: 'POST',
				body
			}
		)
		return { data, pending, error, refresh }
	}

	async function tokenRefresh(body: TokenRefreshBody) {
		const { data, pending, error, refresh } = await useFetch<TokenRefreshResponse>(
			'/api/auth/token/refresh/',
			{
				method: 'POST',
				body
			}
		)
		return { data, pending, error, refresh }
	}

	async function socialAccounts() {
		const { data, pending, error, refresh } = await useFetch<SocialAccountResponse>(
			'/api/auth/social-accounts/',
			{
				method: 'GET'
			}
		)
		return { data, pending, error, refresh }
	}

	async function socialAccountDisconnect(id: number, body: SocialAccountDisconnectBody) {
		const { data, pending, error, refresh } =
			await useFetch<SocialAccountDisconnectResponse>(
				`/api/auth/social-accounts/${id}/disconnect/`,
				{
					method: 'POST',
					body
				}
			)
		return { data, pending, error, refresh }
	}

	async function isUserRegistered(body: IsUserRegisteredBody) {
		const { data, pending, error, refresh } = await useFetch<IsUserRegisteredBody>(
			'/api/auth/is-user-registered/',
			{
				method: 'POST',
				body
			}
		)
		return { data, pending, error, refresh }
	}

	return {
		login,
		loginWithProvider,
		fetchUser,
		logout,
		register,
		passwordReset,
		passwordResetConfirm,
		passwordChange,
		registrationResendEmail,
		registrationVerifyEmail,
		tokenVerify,
		tokenRefresh,
		socialAccounts,
		socialAccountDisconnect
	}
}
