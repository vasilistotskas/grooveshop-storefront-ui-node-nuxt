import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs, parseBodyAs } from '~/types/parser'
import { SessionRefreshResponse, SessionRefreshBody } from '~/types/auth'

export const ZodSessionRefreshResponse = z.object({
	success: z.boolean()
}) satisfies z.ZodType<SessionRefreshResponse>

export const ZodSessionRefreshBody = z.object({
	refresh: z.string().min(1)
}) satisfies z.ZodType<SessionRefreshBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodSessionRefreshBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/session/refresh/`,
			event,
			{
				body: JSON.stringify(body),
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodSessionRefreshResponse)
	} catch (error) {
		await handleError(error)
	}
})
