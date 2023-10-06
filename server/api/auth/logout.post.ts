import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs, parseBodyAs } from '~/types/parser'
import { LogoutResponse, LogoutBody } from '~/types/auth'

export const ZodLogoutResponse = z.object({
	detail: z.string().min(1)
}) satisfies z.ZodType<LogoutResponse>

export const ZodLogoutBody = z.object({}) satisfies z.ZodType<LogoutBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodLogoutBody)
		const response = await $api(`${config.public.apiBaseUrl}/auth/logout/`, event, {
			body: JSON.stringify(body),
			method: 'POST'
		})
		deleteRefreshTokenCookie(event)
		event.context.auth = null
		return await parseDataAs(response, ZodLogoutResponse)
	} catch (error) {
		deleteRefreshTokenCookie(event)
		await handleError(error)
	}
})
