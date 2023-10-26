import type { H3Event } from 'h3'
import type { CookieSerializeOptions } from 'cookie-es'

export function setTotpAuthenticatedCookie(event: H3Event, authenticated: string) {
	const config = useRuntimeConfig()
	setCookie(event, config.auth.totp.authenticated.cookieName, authenticated, {
		httpOnly: config.auth.totp.authenticated.httpOnly,
		secure: config.auth.totp.authenticated.secure,
		maxAge: config.auth.totp.authenticated.maxAge,
		sameSite: config.auth.totp.authenticated
			.sameSite as CookieSerializeOptions['sameSite']
	})
}

export function getTotpAuthenticatedFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const totpAuthenticated = getCookie(event, config.auth.totp.authenticated.cookieName!)
	return totpAuthenticated
}

export function deleteTotpAuthenticatedCookie(event: H3Event) {
	const config = useRuntimeConfig()
	deleteCookie(event, config.auth.totp.authenticated.cookieName)
}

export function setTotpActiveCookie(event: H3Event, active: boolean) {
	const config = useRuntimeConfig()
	setCookie(event, config.auth.totp.active.cookieName, active.toString(), {
		httpOnly: config.auth.totp.active.httpOnly,
		secure: config.auth.totp.active.secure,
		maxAge: config.auth.totp.active.maxAge,
		sameSite: config.auth.totp.active.sameSite as CookieSerializeOptions['sameSite']
	})
}

export function getTotpActiveFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const totpActive = getCookie(event, config.auth.totp.active.cookieName!)
	return totpActive
}

export function deleteTotpActiveCookie(event: H3Event) {
	const config = useRuntimeConfig()
	deleteCookie(event, config.auth.totp.active.cookieName)
}
