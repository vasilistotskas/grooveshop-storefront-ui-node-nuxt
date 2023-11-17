import type { H3Event } from 'h3'
import { z } from 'zod'
import type { LogoutResponse, LogoutBody } from '~/types/auth'

export const ZodLogoutResponse = z.object({
	detail: z.string().min(1)
}) satisfies z.ZodType<LogoutResponse>

export const ZodLogoutBody = z.object({}) satisfies z.ZodType<LogoutBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodLogoutBody)
		const response = await $api(`${config.public.apiBaseUrl}/auth/logout`, event, {
			body: JSON.stringify(body),
			method: 'POST'
		})

		deleteRefreshTokenCookie(event)
		deleteSessionIdCookie(event)
		deleteCsrftokenCookie(event)

		event.context.jwt_auth = null
		event.context.user = null
		event.context.sessionid = null
		event.context.csrftoken = null

		return await parseDataAs(response, ZodLogoutResponse)
	} catch (error) {
		deleteRefreshTokenCookie(event)
		deleteSessionIdCookie(event)
		deleteCsrftokenCookie(event)
		await handleError(error)
	}
})
