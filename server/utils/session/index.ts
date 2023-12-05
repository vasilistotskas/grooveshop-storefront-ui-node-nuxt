import type { H3Event } from 'h3'
import type { CookieSerializeOptions } from 'cookie-es'

// Session
export function setSessionIdCookie(event: H3Event, session: string) {
	const config = useRuntimeConfig()
	const sessionCookieName = config?.auth?.session?.cookieName || 'sessionid'
	setCookie(event, sessionCookieName, session, {
		domain: config?.auth?.session?.domain,
		httpOnly: config?.auth?.session?.httpOnly,
		secure: config?.auth?.session?.secure,
		maxAge: config?.auth?.session?.maxAge,
		sameSite: config?.auth?.session?.sameSite as CookieSerializeOptions['sameSite']
	})
}

export function getSessionIdFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const sessionCookieName = config?.auth?.session?.cookieName || 'sessionid'
	const session = getCookie(event, sessionCookieName)
	return session
}

export function getSessionIdFromHeader(event: H3Event) {
	const authorization = getRequestHeader(event, 'cookie')
	if (authorization) {
		const session = authorization
			.split('; ')
			.find((c) => c.startsWith('sessionid='))
			?.split('=')[1]
		return session
	}
}

export function deleteSessionIdCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const sessionCookieName = config?.auth?.session?.cookieName || 'sessionid'
	deleteCookie(event, sessionCookieName)
}

// CSRFToken
export function setCsrftokenCookie(event: H3Event, csrftoken: string) {
	const config = useRuntimeConfig()
	const csrfCookieName = config?.auth?.csrftoken?.cookieName || 'csrftoken'
	setCookie(event, csrfCookieName, csrftoken, {
		domain: config?.auth?.csrftoken?.domain,
		httpOnly: config?.auth?.csrftoken?.httpOnly,
		secure: config?.auth?.csrftoken?.secure,
		maxAge: config?.auth?.csrftoken?.maxAge,
		sameSite: config?.auth?.csrftoken?.sameSite as CookieSerializeOptions['sameSite']
	})
}

export function getCsrftokenFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const csrfCookieName = config?.auth?.csrftoken?.cookieName || 'csrftoken'
	const csrftoken = getCookie(event, csrfCookieName)
	return csrftoken
}

export function getCsrftokenFromHeader(event: H3Event) {
	const authorization = getRequestHeader(event, 'cookie')
	if (authorization) {
		const csrftoken = authorization
			.split('; ')
			.find((c) => c.startsWith('csrftoken='))
			?.split('=')[1]
		return csrftoken
	}
}

export function deleteCsrftokenCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const csrfCookieName = config?.auth?.csrftoken?.cookieName || 'csrftoken'
	deleteCookie(event, csrfCookieName)
}
