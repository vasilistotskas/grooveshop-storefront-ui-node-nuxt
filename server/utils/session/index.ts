import type { H3Event } from 'h3'
import type { CookieSerializeOptions } from 'cookie-es'

// Session
export function setSessionIdCookie(event: H3Event, session: string) {
	const config = useRuntimeConfig()
	setCookie(event, config.auth.session.cookieName, session, {
		httpOnly: config.auth.session.httpOnly,
		secure: config.auth.session.secure,
		maxAge: config.auth.session.maxAge,
		sameSite: config.auth.session.sameSite as CookieSerializeOptions['sameSite']
	})
}

export function getSessionIdFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const session = getCookie(event, config.auth.session.cookieName!)
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
	deleteCookie(event, config.auth.session.cookieName)
}

// CSRFToken
export function setCsrftokenCookie(event: H3Event, csrftoken: string) {
	const config = useRuntimeConfig()
	setCookie(event, config.auth.csrftoken.cookieName, csrftoken, {
		httpOnly: config.auth.csrftoken.httpOnly,
		secure: config.auth.csrftoken.secure,
		maxAge: config.auth.csrftoken.maxAge,
		sameSite: config.auth.csrftoken.sameSite as CookieSerializeOptions['sameSite']
	})
}

export function getCsrftokenFromCookie(event: H3Event) {
	const config = useRuntimeConfig()
	const csrftoken = getCookie(event, config.auth.csrftoken.cookieName!)
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
	deleteCookie(event, config.auth.csrftoken.cookieName)
}
