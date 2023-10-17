import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs, parseBodyAs } from '~/types/parser'
import { LoginResponse, LoginBody } from '~/types/auth'

export const ZodLoginResponse = z.object({
	access: z.string(),
	refresh: z.string().nullish(),
	user: z.object({
		id: z.number(),
		email: z.string()
	})
}) satisfies z.ZodType<LoginResponse>

export const ZodLoginBody = z.object({
	email: z.string(),
	password: z.string()
}) satisfies z.ZodType<LoginBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodLoginBody)
		const response = await $api(`${config.public.apiBaseUrl}/auth/login/`, event, {
			body: JSON.stringify(body),
			method: 'POST'
		})
		const loginResponse = await parseDataAs(response, ZodLoginResponse)
		if (loginResponse.refresh) {
			setRefreshTokenCookie(event, loginResponse.refresh)
		}
		event.context.jwt_auth = loginResponse.access
		return loginResponse
	} catch (error) {
		await handleError(error)
	}
})
