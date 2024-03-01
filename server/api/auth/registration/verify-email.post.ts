import type { H3Event } from 'h3'
import { z } from 'zod'

import type {
	RegistrationVerifyEmailBody,
	RegistrationVerifyEmailResponse
} from '~/types/auth'

export const ZodRegistrationVerifyEmailResponse = z.object({
	detail: z.string().min(1)
}) satisfies z.ZodType<RegistrationVerifyEmailResponse>

export const ZodRegistrationVerifyEmailBody = z.object({
	key: z.string().min(1)
}) satisfies z.ZodType<RegistrationVerifyEmailBody>

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await readValidatedBody(event, ZodRegistrationVerifyEmailBody.parse)
		const response = await $fetch(
			`${config.public.apiBaseUrl}/auth/registration/verify-email`,
			{
				body,
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodRegistrationVerifyEmailResponse)
	} catch (error) {
		await handleError(error)
	}
})
