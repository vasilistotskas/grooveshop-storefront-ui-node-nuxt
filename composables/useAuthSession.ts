import {
	deleteCookie,
	getCookie,
	setCookie,
	splitCookiesString,
	appendResponseHeader
} from 'h3'
import { decodeJwt } from 'jose'
import type { Ref } from 'vue'
import type { User, TokenRefreshResponse } from '~/types/auth'

export default function () {
	const event = useRequestEvent()
	const config = useRuntimeConfig()
	const publicConfig = config.public
	const privateConfig = config
	const loggedInName = 'auth_logged_in'
	const accessTokenCookieName = process.server
		? privateConfig.auth.accessToken.cookieName!
		: 'jwt-auth'
	const refreshTokenCookieName = process.server
		? privateConfig.auth.refreshToken.cookieName!
		: 'jwt-refresh-auth'

	const msRefreshBeforeExpires = 3000

	const _accessToken = {
		get: () =>
			process.server
				? event.context[accessTokenCookieName] || getCookie(event, accessTokenCookieName)
				: useCookie(accessTokenCookieName).value,
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

	async function getRefreshToken() {
		const refreshToken = _refreshToken.get()

		if (refreshToken && isTokenExpired(refreshToken)) {
			await _refresh()
		}

		return _refreshToken.get()
	}

	return {
		_accessToken,
		_refreshToken,
		_loggedIn,
		user,
		isAuthenticated,
		_refresh,
		getAccessToken,
		getRefreshToken
	}
}
