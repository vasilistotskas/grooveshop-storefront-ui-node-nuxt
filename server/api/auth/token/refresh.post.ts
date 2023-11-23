import type { H3Event } from 'h3'
import { z } from 'zod'

import type { TokenRefreshResponse, TokenRefreshBody } from '~/types/auth'

export const ZodTokenRefreshResponse = z.object({
	access: z.string().min(1),
	accessExpiration: z.string().min(1)
}) satisfies z.ZodType<TokenRefreshResponse>

export const ZodTokenRefreshBody = z.object({
	refresh: z.string().min(1)
}) satisfies z.ZodType<TokenRefreshBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodTokenRefreshBody)
		const response = await $api(`${config.public.apiBaseUrl}/auth/token/refresh`, event, {
			body: JSON.stringify(body),
			method: 'POST'
		})
		return await parseDataAs(response, ZodTokenRefreshResponse)
	} catch (error) {
		deleteRefreshTokenCookie(event)
		await handleError(error)
	}
})
