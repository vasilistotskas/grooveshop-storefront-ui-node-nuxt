import { H3Event, sendRedirect } from 'h3'

import { isTokenExpired } from '~/server/utils/jwt'
import type { TokenVerifyResponse } from '~/types/auth'

export default defineNitroPlugin(() => {
	const handleResponseError = async (error: any, event: H3Event) => {
		const statuses = [401, 403, 500]
		if (error.status && statuses.includes(error.status)) {
			await sendRedirect(event, '/auth/login')
		} else {
			await handleError(error)
		}
	}

	sessionHooks.hook('fetch', async (session, event) => {
		const shouldRefreshToken =
			session.token &&
			session.refreshToken &&
			session.rememberMe &&
			isTokenExpired(session.token) &&
			!isTokenExpired(session.refreshToken)

		if (shouldRefreshToken) {
			try {
				await $fetch<TokenVerifyResponse>('/api/auth/token/refresh', {
					method: 'POST',
					body: {
						refresh: session.refreshToken
					}
				})
			} catch (error) {
				await handleResponseError(error, event)
			}
		}

		try {
			await $fetch<TokenVerifyResponse>('/api/auth/token/verify', {
				method: 'POST',
				body: {
					token: session.token
				}
			})
		} catch (error) {
			await handleResponseError(error, event)
		}
	})
})
