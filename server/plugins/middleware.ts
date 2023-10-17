export default defineNitroPlugin((nitroApp) => {
	const config = useRuntimeConfig()
	// @ts-ignore
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
		}
	})
})
