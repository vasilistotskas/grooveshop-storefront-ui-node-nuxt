import type { H3Event } from 'h3'
import { z } from 'zod'

import type { PasswordResetConfirmResponse, PasswordResetConfirmBody } from '~/types/auth'

export const ZodPasswordResetConfirmResponse = z.object({
	detail: z.string()
}) satisfies z.ZodType<PasswordResetConfirmResponse>

export const ZodPasswordResetConfirmBody = z.object({
	newPassword1: z.string(),
	newPassword2: z.string(),
	uid: z.string(),
	token: z.string()
}) satisfies z.ZodType<PasswordResetConfirmBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodPasswordResetConfirmBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/password/reset/confirm`,
			event,
			{
				body: JSON.stringify(body),
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodPasswordResetConfirmResponse)
	} catch (error) {
		await handleError(error)
	}
})
