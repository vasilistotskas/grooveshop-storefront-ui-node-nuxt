import {
	appendResponseHeader,
	deleteCookie,
	getCookie,
	setCookie,
	splitCookiesString
} from 'h3'
import { decodeJwt } from 'jose'
import type { Ref } from 'vue'
import type { TokenRefreshResponse, User } from '~/types/auth'

export default function () {
	const event = useRequestEvent()
	const config = useRuntimeConfig()
	const publicConfig = config.public
	const privateConfig = config
	const loggedInName = 'auth_logged_in'

	const accessTokenCookieName = process.server
		? privateConfig.auth.accessToken.cookieName!
		: 'jwt_auth'
	const refreshTokenCookieName = process.server
		? privateConfig.auth.refreshToken.cookieName!
		: 'jwt_refresh_auth'
	const totpAuthenticatedCookieName = process.server
		? privateConfig.auth.totp.authenticated.cookieName!
		: 'totp_authenticated'
	const totpActiveCookieName = process.server
		? privateConfig.auth.totp.active.cookieName!
		: 'totp_active'

	const msRefreshBeforeExpires = 3000

	const _accessToken = {
		get: () => {
			if (process.server) {
				return (
					event.context[accessTokenCookieName] || getCookie(event, accessTokenCookieName)
				)
			} else {
				return useCookie(accessTokenCookieName).value
			}
		},
		set: (value: string) => {
			if (process.server) {
				event.context[accessTokenCookieName] = value
				setCookie(event, accessTokenCookieName, value, {
					httpOnly: false,
					secure: true,
					sameSite: 'lax'
				})
			} else {
				useCookie(accessTokenCookieName, {
					httpOnly: false,
					secure: true,
					sameSite: 'lax'
				}).value = value
			}
		},
		clear: () => {
			if (process.server) {
				deleteCookie(event, accessTokenCookieName, {
					httpOnly: false,
					secure: true,
					sameSite: 'lax'
				})
			} else {
				useCookie(accessTokenCookieName).value = null
			}
		}
	}

	const _refreshToken = {
		get: () => process.server && getCookie(event, refreshTokenCookieName),
		clear: () =>
			process.server &&
			deleteCookie(event, refreshTokenCookieName, {
				httpOnly: true,
				secure: true,
				sameSite: 'lax'
			})
	}

	const _totpAuthenticated = {
		get: () => {
			if (process.server) {
				return (
					event.context[totpAuthenticatedCookieName] ||
					getCookie(event, totpAuthenticatedCookieName) === 'true'
				)
			} else {
				return useCookie(totpAuthenticatedCookieName).value
			}
		},
		set: (value: string) => {
			if (process.server) {
				event.context[totpAuthenticatedCookieName] = value
				setCookie(event, totpAuthenticatedCookieName, value, {
					httpOnly: false,
					secure: true,
					sameSite: 'lax'
				})
			} else {
				useCookie(totpAuthenticatedCookieName, {
					httpOnly: false,
					secure: true,
					sameSite: 'lax'
				}).value = value
			}
		},
		clear: () => {
			if (process.server) {
				deleteCookie(event, totpAuthenticatedCookieName, {
					httpOnly: false,
					secure: true,
					sameSite: 'lax'
				})
			} else {
				useCookie(totpAuthenticatedCookieName).value = null
			}
		}
	}

	const _totpActive = {
		get: () => {
			if (process.server) {
				return (
					event.context[totpActiveCookieName] ||
					getCookie(event, totpActiveCookieName) === 'true'
				)
			} else {
				return useCookie(totpActiveCookieName).value
			}
		},
		set: (value: string) => {
			if (process.server) {
				event.context[totpActiveCookieName] = value
				setCookie(event, totpActiveCookieName, value, {
					httpOnly: false,
					secure: true,
					sameSite: 'lax'
				})
			} else {
				const cookie = useCookie(totpActiveCookieName, {
					httpOnly: false,
					secure: true,
					sameSite: 'lax'
				})
				cookie.value = value
			}
		},
		clear: () => {
			if (process.server) {
				deleteCookie(event, totpActiveCookieName, {
					httpOnly: false,
					secure: true,
					sameSite: 'lax'
				})
			} else {
				useCookie(totpActiveCookieName).value = null
			}
		}
	}

	const _loggedIn = {
		get: () => process.client && localStorage.getItem(loggedInName),
		set: (value: boolean) =>
			process.client && localStorage.setItem(loggedInName, value.toString())
	}

	const user: Ref<Readonly<User | null | undefined>> = useState<User | null | undefined>(
		'auth-user',
		() => null
	)

	const isAuthenticated = computed<boolean>(() => {
		return user.value !== null
	})

	function isTokenExpired(token: string) {
		const { exp } = decodeJwt(token)
		const expires = exp! * 1000 - msRefreshBeforeExpires
		return expires < Date.now()
	}

	async function _refresh() {
		const isRefreshOn = useState('auth-refresh-loading', () => false)

		if (isRefreshOn.value) {
			return
		}

		isRefreshOn.value = true

		const cookie = useRequestHeaders(['cookie']).cookie || ''
		const refreshToken = _refreshToken.get()

		if (!refreshToken) {
			isRefreshOn.value = false
			return
		}

		await $fetch
			.raw<TokenRefreshResponse>('/api/auth/token/refresh', {
				method: 'POST',
				body: {
					refresh: refreshToken
				},
				headers: {
					cookie
				}
			})
			.then((res) => {
				const setCookie = res.headers.get('set-cookie') || ''

				const cookies = splitCookiesString(setCookie)

				for (const cookie of cookies) {
					appendResponseHeader(event, 'set-cookie', cookie)
				}

				if (res._data) {
					_accessToken.set(res._data.access)
					_loggedIn.set(true)
				}
				isRefreshOn.value = false
				return res
			})
			.catch(async () => {
				isRefreshOn.value = false
				_accessToken.clear()
				_loggedIn.set(false)
				user.value = null
				if (process.client) {
					await navigateTo(publicConfig.auth.redirect.logout)
				}
			})
	}

	/**
	 * Async get access token
	 * @returns Fresh access token (refreshed if expired)
	 */
	async function getAccessToken() {
		const accessToken = _accessToken.get()

		if (accessToken && isTokenExpired(accessToken)) {
			await _refresh()
		}

		return _accessToken.get()
	}

	return {
		_accessToken,
		_refreshToken,
		_loggedIn,
		_totpAuthenticated,
		_totpActive,
		user,
		isAuthenticated,
		_refresh,
		getAccessToken
	}
}
