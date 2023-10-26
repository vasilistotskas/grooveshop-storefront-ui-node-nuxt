import type { H3Event } from 'h3'

export function getAccessTokenFromHeader(event: H3Event) {
	const authorization = getRequestHeader(event, 'cookie')
	if (authorization) {
		const accessToken = authorization
			.split('; ')
			.find((c) => c.startsWith('jwt_auth='))
			?.split('=')[1]
		return accessToken
	}
}

export function deleteAccessTokenCookie(event: H3Event) {
	const config = useRuntimeConfig()
	deleteCookie(event, config.auth.accessToken.cookieName)
}
