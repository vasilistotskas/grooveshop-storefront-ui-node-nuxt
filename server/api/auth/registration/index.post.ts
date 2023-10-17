import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs, parseBodyAs } from '~/types/parser'
import { RegistrationResponse, RegistrationBody } from '~/types/auth'

export const ZodRegistrationResponse = z.object({
	access: z.string(),
	refresh: z.string(),
	user: z.object({
		id: z.number().int(),
		email: z.string().email()
	})
}) satisfies z.ZodType<RegistrationResponse>

export const ZodRegistrationBody = z.object({
	email: z.string().email(),
	password1: z.string().min(1),
	password2: z.string().min(1)
}) satisfies z.ZodType<RegistrationBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodRegistrationBody)
		const response = await $api(`${config.public.apiBaseUrl}/auth/registration/`, event, {
			body: JSON.stringify(body),
			method: 'POST'
		})
		const registrationResponse = await parseDataAs(response, ZodRegistrationResponse)
		if (registrationResponse.refresh) {
			setRefreshTokenCookie(event, registrationResponse.refresh)
		}
		event.context.jwt_auth = registrationResponse.access
		return registrationResponse
	} catch (error) {
		await handleError(error)
	}
})
