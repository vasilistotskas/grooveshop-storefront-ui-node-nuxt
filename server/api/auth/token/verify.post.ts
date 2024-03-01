import type { H3Event } from 'h3'
import { z } from 'zod'

import type { TokenVerifyBody, TokenVerifyResponse } from '~/types/auth'

export const ZodTokenVerifyResponse = z.object(
	{}
) satisfies z.ZodType<TokenVerifyResponse>

export const ZodTokenVerifyBody = z.object({
	token: z.string().min(1)
}) satisfies z.ZodType<TokenVerifyBody>

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	try {
		const body = await readValidatedBody(event, ZodTokenVerifyBody.parse)
		const response = await $fetch(`${config.public.apiBaseUrl}/auth/token/verify`, {
			method: 'POST',
			body,
			headers: {
				Authorization: `Bearer ${session?.token}`
			}
		})
		return await parseDataAs(response, ZodTokenVerifyResponse)
	} catch (error) {
		await clearUserSession(event)
		await handleError(error)
	}
})
