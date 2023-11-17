import type { H3Event } from 'h3'
import { z } from 'zod'

import type { PasswordResetResponse, PasswordResetBody } from '~/types/auth'

export const ZodPasswordResetResponse = z.object({
	detail: z.string()
}) satisfies z.ZodType<PasswordResetResponse>

export const ZodPasswordResetBody = z.object({
	email: z.string()
}) satisfies z.ZodType<PasswordResetBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodPasswordResetBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/password/reset`,
			event,
			{
				body: JSON.stringify(body),
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodPasswordResetResponse)
	} catch (error) {
		await handleError(error)
	}
})
