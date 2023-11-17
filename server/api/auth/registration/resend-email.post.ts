import type { H3Event } from 'h3'
import { z } from 'zod'

import type {
	RegistrationResendEmailResponse,
	RegistrationResendEmailBody
} from '~/types/auth'

export const ZodRegistrationResendEmailResponse = z.object({
	detail: z.string().min(1)
}) satisfies z.ZodType<RegistrationResendEmailResponse>

export const ZodRegistrationResendEmailBody = z.object({
	email: z.string().email()
}) satisfies z.ZodType<RegistrationResendEmailBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodRegistrationResendEmailBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/registration/resend-email`,
			event,
			{
				body: JSON.stringify(body),
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodRegistrationResendEmailResponse)
	} catch (error) {
		await handleError(error)
	}
})
