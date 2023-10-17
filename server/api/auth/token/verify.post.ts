import { H3Event } from 'h3'
import { z } from 'zod'
import { parseBodyAs, parseDataAs } from '~/types/parser'
import { TokenVerifyBody, TokenVerifyResponse } from '~/types/auth'

export const ZodTokenVerifyResponse = z.object(
	{}
) satisfies z.ZodType<TokenVerifyResponse>

export const ZodTokenVerifyBody = z.object({
	token: z.string().min(1)
}) satisfies z.ZodType<TokenVerifyBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodTokenVerifyBody)
		const response = await $api(`${config.public.apiBaseUrl}/auth/token/verify/`, event, {
			body: JSON.stringify(body),
			method: 'POST'
		})
		return await parseDataAs(response, ZodTokenVerifyResponse)
	} catch (error) {
		await handleError(error)
	}
})
