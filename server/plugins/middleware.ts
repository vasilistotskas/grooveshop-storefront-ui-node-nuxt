export default defineNitroPlugin((nitroApp) => {
	const config = useRuntimeConfig()
	nitroApp.hooks.hook('request', async (event: any) => {
		const accessToken = getAccessTokenFromHeader(event)

		if (accessToken) {
			await $api(`${config.public.apiBaseUrl}/auth/token/verify/`, event, {
				body: JSON.stringify({ token: accessToken }),
				method: 'POST'
			})
				.then(() => {
					event.context.jwt_auth = accessToken
				})
				.catch(() => {
					event.context.jwt_auth = null
					deleteAccessTokenCookie(event)
					deleteRefreshTokenCookie(event)
				})
		} else {
			event.context.jwt_auth = null
			deleteAccessTokenCookie(event)
			deleteRefreshTokenCookie(event)
		}

		const sessionid = getSessionIdFromHeader(event)
		const csrftoken = getCsrftokenFromHeader(event)

		if (sessionid) {
			event.context.sessionid = sessionid
		} else {
			event.context.sessionid = null
			deleteSessionIdCookie(event)
		}

		if (csrftoken) {
			event.context.csrftoken = csrftoken
		} else {
			event.context.csrftoken = null
			deleteCsrftokenCookie(event)
		}
	})
})
