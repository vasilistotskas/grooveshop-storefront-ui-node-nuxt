import { getRequestHeader, deleteCookie, setCookie, getCookie } from 'h3'
import type { H3Event } from 'h3'

export function setTotpAuthenticatedCookie(event: H3Event, authenticated: string) {
	const config = useRuntimeConfig()
	setCookie(event, config.auth.totp.authenticated.cookieName!, authenticated, {
		httpOnly: false,
		secure: true,
		maxAge: config.auth.totp.authenticated.maxAge,
		sameSite: 'lax'
	})
}

export function getTotpAuthenticatedFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const totpAuthenticated = getCookie(event, config.auth.totp.authenticated.cookieName!)
	return totpAuthenticated
}

export function deleteTotpAuthenticatedCookie(event: H3Event) {
	const config = useRuntimeConfig()
	deleteCookie(event, config.auth.totp.authenticated.cookieName!, {
		httpOnly: false,
		secure: true,
		sameSite: 'lax'
	})
}

export function setTotpActiveCookie(event: H3Event, active: boolean) {
	const config = useRuntimeConfig()
	setCookie(event, config.auth.totp.active.cookieName!, active.toString(), {
		httpOnly: false,
		secure: true,
		maxAge: config.auth.totp.active.maxAge,
		sameSite: 'lax'
	})
}

export function getTotpActiveFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const totpActive = getCookie(event, config.auth.totp.active.cookieName!)
	return totpActive
}

export function deleteTotpActiveCookie(event: H3Event) {
	const config = useRuntimeConfig()
	deleteCookie(event, config.auth.totp.active.cookieName!, {
		httpOnly: false,
		secure: true,
		sameSite: 'lax'
	})
}
