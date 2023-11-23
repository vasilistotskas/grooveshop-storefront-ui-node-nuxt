import type { H3Event } from 'h3'
import type { CookieSerializeOptions } from 'cookie-es'

export function setRefreshTokenCookie(event: H3Event, refreshToken: string) {
	const config = useRuntimeConfig()
	const refreshTokenCookieName =
		config?.auth?.refreshToken?.cookieName || 'jwt_refresh_auth'
	setCookie(event, refreshTokenCookieName, refreshToken, {
		httpOnly: config?.auth?.refreshToken?.httpOnly,
		secure: config?.auth?.refreshToken?.secure,
		maxAge: config?.auth?.refreshToken?.maxAge,
		sameSite: config?.auth?.refreshToken?.sameSite as CookieSerializeOptions['sameSite']
	})
}

export function getRefreshTokenFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const refreshTokenCookieName =
		config?.auth?.refreshToken?.cookieName || 'jwt_refresh_auth'
	const refreshToken = getCookie(event, refreshTokenCookieName)
	return refreshToken
}

export function deleteRefreshTokenCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const refreshTokenCookieName =
		config?.auth?.refreshToken?.cookieName || 'jwt_refresh_auth'
	deleteCookie(event, refreshTokenCookieName)
}
