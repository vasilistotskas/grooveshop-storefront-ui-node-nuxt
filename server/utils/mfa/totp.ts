import type { H3Event } from 'h3'
import type { CookieSerializeOptions } from 'cookie-es'

export function setTotpAuthenticatedCookie(event: H3Event, authenticated: string) {
	const config = useRuntimeConfig()
	const toptAuthenticatedCookieName = config?.auth?.totp?.authenticated?.cookieName || 'totp_authenticated'
	setCookie(event, toptAuthenticatedCookieName, authenticated, {
		httpOnly: config?.auth?.totp?.authenticated?.httpOnly,
		secure: config?.auth?.totp?.authenticated?.secure,
		maxAge: config?.auth?.totp?.authenticated?.maxAge,
		sameSite: config?.auth?.totp?.authenticated
			.sameSite as CookieSerializeOptions['sameSite']
	})
}

export function getTotpAuthenticatedFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const toptAuthenticatedCookieName = config?.auth?.totp?.authenticated?.cookieName || 'totp_authenticated'
	const totpAuthenticated = getCookie(event, toptAuthenticatedCookieName)
	return totpAuthenticated
}

export function deleteTotpAuthenticatedCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const toptAuthenticatedCookieName = config?.auth?.totp?.authenticated?.cookieName || 'totp_authenticated'
	deleteCookie(event, toptAuthenticatedCookieName)
}

export function setTotpActiveCookie(event: H3Event, active: boolean) {
	const config = useRuntimeConfig()
	const toptActiveCookieName = config?.auth?.totp?.active?.cookieName || 'totp_active'
	setCookie(event, toptActiveCookieName, active.toString(), {
		httpOnly: config?.auth?.totp?.active?.httpOnly,
		secure: config?.auth?.totp?.active?.secure,
		maxAge: config?.auth?.totp?.active?.maxAge,
		sameSite: config?.auth?.totp?.active?.sameSite as CookieSerializeOptions['sameSite']
	})
}

export function getTotpActiveFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const toptActiveCookieName = config?.auth?.totp?.active?.cookieName || 'totp_active'
	const totpActive = getCookie(event, toptActiveCookieName)
	return totpActive
}

export function deleteTotpActiveCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const toptActiveCookieName = config?.auth?.totp?.active?.cookieName || 'totp_active'
	deleteCookie(event, config?.auth?.totp?.active?.cookieName)
}
