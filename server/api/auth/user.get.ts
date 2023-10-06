import { H3Event } from 'h3'
import { z } from 'zod'

import { parseDataAs } from '~/types/parser'
import { User } from '~/types/auth'

export const ZodUser = z.object({
	id: z.number().int(),
	email: z.string().email()
}) satisfies z.ZodType<User>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()

	try {
		const auth = event.context.auth

		if (!auth) {
			throw createError({
				statusCode: 401,
				message: 'Unauthorized'
			})
		}

		const response = await $api(`${config.public.apiBaseUrl}/auth/user/`, event, {
			method: 'GET'
		})
		return parseDataAs(response, ZodUser)
	} catch (error) {
		await handleError(error)
	}
})
