import type { H3Event } from 'h3'
import { z } from 'zod'

import type {
	RegistrationVerifyEmailResponse,
	RegistrationVerifyEmailBody
} from '~/types/auth'

export const ZodRegistrationVerifyEmailResponse = z.object({
	detail: z.string().min(1)
}) satisfies z.ZodType<RegistrationVerifyEmailResponse>

export const ZodRegistrationVerifyEmailBody = z.object({
	key: z.string().min(1)
}) satisfies z.ZodType<RegistrationVerifyEmailBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodRegistrationVerifyEmailBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/registration/verify-email`,
			event,
			{
				body: JSON.stringify(body),
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodRegistrationVerifyEmailResponse)
	} catch (error) {
		await handleError(error)
	}
})
