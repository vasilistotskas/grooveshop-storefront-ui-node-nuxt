import type { H3Event } from 'h3'
import { decodeJwt } from 'jose'
import type { Ref } from 'vue'
import type { CookieSerializeOptions } from 'cookie-es'
import {
	setCookie,
	getCookie,
	deleteCookie,
	splitCookiesString,
	appendResponseHeader
} from 'h3'
import type {
	TokenRefreshResponse,
	User,
	Session,
	SessionRevokeResponse
} from '~/types/auth'
import { defaultAuthCookieNames } from '~/types/auth'

export default function () {
	const event = useRequestEvent()
	const config = useRuntimeConfig()
	const publicConfig = config.public
	const privateConfig = config
	const loggedInName = 'auth_logged_in'

	const sessionCookieName = privateConfig.auth.session.cookieName || defaultAuthCookieNames.sessionCookieName
	const csrftokenCookieName = privateConfig.auth.csrftoken.cookieName || defaultAuthCookieNames.csrftokenCookieName
	const accessTokenCookieName = privateConfig.auth.accessToken.cookieName || defaultAuthCookieNames.accessTokenCookieName
	const refreshTokenCookieName = privateConfig.auth.refreshToken.cookieName || defaultAuthCookieNames.refreshTokenCookieName
	const totpAuthenticatedCookieName = privateConfig.auth.totp.authenticated.cookieName || defaultAuthCookieNames.totpAuthenticatedCookieName
	const totpActiveCookieName = privateConfig.auth.totp.active.cookieName || defaultAuthCookieNames.totpActiveCookieName

	const msRefreshBeforeExpires = 3000

	const createCookieObject = (
		event: H3Event,
		cookieName: string,
		httpOnly: boolean = false,
		secure: boolean = true,
		maxAge: number | undefined = undefined,
		sameSite: CookieSerializeOptions['sameSite'] = 'lax'
	) => {
		return {
			get: () => {
				try {
					if (process.server) {
						return event.context[cookieName] || getCookie(event, cookieName)
					} else {
						return useCookie(cookieName).value
					}
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error(e)
					return null
				}
			},
			set: (value: string) => {
				try {
					if (process.server) {
						event.context[cookieName] = value
						setCookie(event, cookieName, value, {
							httpOnly,
							secure,
							maxAge,
							sameSite
						})
					} else {
						useCookie(cookieName, {
							httpOnly,
							secure,
							maxAge,
							sameSite
						}).value = value
					}
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error(e)
				}
			},
			clear: () => {
				try {
					if (process.server) {
						deleteCookie(event, cookieName)
					} else {
						useCookie(cookieName).value = null
					}
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error(e)
				}
			}
		}
	}

	const _session = createCookieObject(
		event,
		sessionCookieName,
		privateConfig?.auth?.session?.httpOnly || true,
		privateConfig?.auth?.session?.secure || true,
		privateConfig?.auth?.session?.maxAge || 60 * 60 * 24 * 7, // 7 days
		(privateConfig?.auth?.session?.sameSite as CookieSerializeOptions['sameSite']) ||
			'lax'
	)
	const _csrftoken = createCookieObject(
		event,
		csrftokenCookieName,
		privateConfig?.auth?.csrftoken?.httpOnly || true,
		privateConfig?.auth?.csrftoken?.secure || true,
		privateConfig?.auth?.csrftoken?.maxAge || 60 * 60 * 24 * 7 * 52, // 1 year
		(privateConfig?.auth?.csrftoken?.sameSite as CookieSerializeOptions['sameSite']) ||
			'lax'
	)
	const _accessToken = createCookieObject(
		event,
		accessTokenCookieName,
		privateConfig?.auth?.accessToken?.httpOnly || false,
		privateConfig?.auth?.accessToken?.secure || true,
		privateConfig?.auth?.accessToken?.maxAge || 60 * 60 * 24 * 7, // 7 days
		(privateConfig?.auth?.accessToken?.sameSite as CookieSerializeOptions['sameSite']) ||
			'lax'
	)
	const _refreshToken = createCookieObject(
		event,
		refreshTokenCookieName,
		privateConfig?.auth?.refreshToken?.httpOnly || true,
		privateConfig?.auth?.refreshToken?.secure || true,
		privateConfig?.auth?.refreshToken?.maxAge || 60 * 60 * 24 * 30, // 30 days
		(privateConfig?.auth?.refreshToken?.sameSite as CookieSerializeOptions['sameSite']) ||
			'lax'
	)
	const _totpAuthenticated = createCookieObject(
		event,
		totpAuthenticatedCookieName,
		privateConfig?.auth?.totp?.authenticated?.httpOnly || false,
		privateConfig?.auth?.totp?.authenticated?.secure || true,
		privateConfig?.auth?.totp?.authenticated?.maxAge || 60 * 60 * 24 * 7, // 7 days
		(privateConfig?.auth?.totp?.authenticated
			?.sameSite as CookieSerializeOptions['sameSite']) || 'lax'
	)
	const _totpActive = createCookieObject(
		event,
		totpActiveCookieName,
		privateConfig?.auth?.totp?.active?.httpOnly || false,
		privateConfig?.auth?.totp?.active?.secure || true,
		privateConfig?.auth?.totp?.active?.maxAge || 60 * 60 * 24 * 7, // 7 days
		(privateConfig?.auth?.totp?.active?.sameSite as CookieSerializeOptions['sameSite']) ||
			'lax'
	)

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
				const setCookies = res.headers.get('set-cookie') || ''

				const cookies = splitCookiesString(setCookies)

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

	async function _refreshSession() {
		const cookie = useRequestHeaders(['cookie']).cookie || ''
		await $fetch
			.raw<Session>('/api/auth/session', {
				method: 'GET',
				headers: {
					cookie
				}
			})
			.then((res) => {
				const setCookies = res.headers.get('set-cookie') || ''
				const cookies = splitCookiesString(setCookies)
				for (const cookie of cookies) {
					appendResponseHeader(event, 'set-cookie', cookie)
				}
				if (res._data) {
					if (res._data.sessionid) {
						_session.set(res._data.sessionid)
					}
					if (res._data.CSRFToken) {
						_csrftoken.set(res._data.CSRFToken)
					}
				}
			})
			.catch((reason) => {
				// eslint-disable-next-line no-console
				console.error('Failed to refresh session', reason)
				_session.clear()
				_csrftoken.clear()
			})
	}

	async function _revokeSession() {
		const cookie = useRequestHeaders(['cookie']).cookie || ''

		await $fetch.raw<SessionRevokeResponse>('/api/auth/session/revoke/', {
			method: 'DELETE',
			headers: {
				cookie
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
		_session,
		_csrftoken,
		_accessToken,
		_refreshToken,
		_loggedIn,
		_totpAuthenticated,
		_totpActive,
		user,
		isAuthenticated,
		_refresh,
		_refreshSession,
		_revokeSession,
		getAccessToken
	}
}
