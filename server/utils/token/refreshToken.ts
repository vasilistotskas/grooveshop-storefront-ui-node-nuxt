import { setCookie, getCookie, deleteCookie } from 'h3'
import type { H3Event } from 'h3'

export function setRefreshTokenCookie(event: H3Event, refreshToken: string) {
	const config = useRuntimeConfig()
	setCookie(event, config.auth.refreshToken.cookieName!, refreshToken, {
		httpOnly: true,
		secure: true,
		maxAge: config.auth.refreshToken.maxAge,
		sameSite: 'lax'
	})
}

export function getRefreshTokenFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const refreshToken = getCookie(event, config.auth.refreshToken.cookieName!)
	return refreshToken
}

export function deleteRefreshTokenCookie(event: H3Event) {
	const config = useRuntimeConfig()
	deleteCookie(event, config.auth.refreshToken.cookieName!, {
		httpOnly: true,
		secure: true,
		sameSite: 'lax'
	})
}
