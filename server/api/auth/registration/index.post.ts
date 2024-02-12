import type { H3Event } from 'h3'
import { z } from 'zod'

import type { RegistrationResponse, RegistrationBody } from '~/types/auth'

export const ZodRegistrationResponse = z.object({
	detail: z.string().nullish(),
	access: z.string().nullish(),
	refresh: z.string().nullish(),
	user: z
		.object({
			id: z.number().int(),
			email: z.string().email()
		})
		.nullish()
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
		const response = await $api(`${config.public.apiBaseUrl}/auth/registration`, event, {
			body,
			method: 'POST'
		})
		const registrationResponse = await parseDataAs(response, ZodRegistrationResponse)
		if (registrationResponse.refresh) {
			setRefreshTokenCookie(event, registrationResponse.refresh)
		}
		if (registrationResponse.access) {
			event.context.jwt_auth = registrationResponse.access
		}
		return registrationResponse
	} catch (error) {
		await handleError(error)
	}
})
