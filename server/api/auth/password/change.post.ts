import type { H3Event } from 'h3'
import { z } from 'zod'

import type { PasswordChangeResponse, PasswordChangeBody } from '~/types/auth'

export const ZodPasswordChangeResponse = z.object({
	detail: z.string()
}) satisfies z.ZodType<PasswordChangeResponse>

export const ZodPasswordChangeBody = z.object({
	newPassword1: z.string(),
	newPassword2: z.string()
}) satisfies z.ZodType<PasswordChangeBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodPasswordChangeBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/password/change/`,
			event,
			{
				body: JSON.stringify(body),
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodPasswordChangeResponse)
	} catch (error) {
		await handleError(error)
	}
})
