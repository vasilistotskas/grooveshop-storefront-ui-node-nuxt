import type { H3Event } from 'h3'
import { z } from 'zod'

import type { IsUserRegisteredBody, IsUserRegisteredResponse } from '~/types/auth'

export const ZodIsUserRegisteredBody = z.object({
	email: z.string()
}) as z.ZodType<IsUserRegisteredBody>

export const ZodIsUserRegisteredResponse = z.object({
	registered: z.boolean()
}) as z.ZodType<IsUserRegisteredResponse>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()

	try {
		const body = await parseBodyAs(event, ZodIsUserRegisteredBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/is_user_registered/`,
			event,
			{
				method: 'POST',
				body: JSON.stringify(body)
			}
		)
		return parseDataAs(response, ZodIsUserRegisteredResponse)
	} catch (error) {
		await handleError(error)
	}
})
