import { H3Event } from 'h3'

export function $api<T>(
	request: Parameters<typeof $fetch<T>>[0],
	event: H3Event,
	opts?: Parameters<typeof $fetch<T>>[1]
) {
	const csrftoken = getCookie(event, 'csrftoken') || ''
	const sessionId = getCookie(event, 'sessionid') || ''
	const cookie = getHeader(event, 'cookie') || ''
	const jwtRefreshAuth = getCookie(event, 'jwt-refresh-auth') || ''
	const jwtAuth = getCookie(event, 'jwt-auth') || ''

	return $fetch<T>(request, {
		...opts,
		method: event.method,
		headers: {
			'X-CSRFToken': csrftoken,
			'jwt-refresh-auth': jwtRefreshAuth,
			'jwt-auth': jwtAuth,
			sessionid: sessionId,
			Cookie: cookie,
			...opts?.headers
		}
	})
}
