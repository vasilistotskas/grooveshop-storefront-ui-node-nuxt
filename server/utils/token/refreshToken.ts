import type { H3Event } from 'h3'
import type { CookieSerializeOptions } from 'cookie-es'

export function setRefreshTokenCookie(event: H3Event, refreshToken: string) {
	const config = useRuntimeConfig()
	setCookie(event, config.auth.refreshToken.cookieName, refreshToken, {
		httpOnly: config.auth.refreshToken.httpOnly,
		secure: config.auth.refreshToken.secure,
		maxAge: config.auth.refreshToken.maxAge,
		sameSite: config.auth.refreshToken.sameSite as CookieSerializeOptions['sameSite']
	})
}

export function getRefreshTokenFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const refreshToken = getCookie(event, config.auth.refreshToken.cookieName)
	return refreshToken
}

export function deleteRefreshTokenCookie(event: H3Event) {
	const config = useRuntimeConfig()
	deleteCookie(event, config.auth.refreshToken.cookieName)
}
