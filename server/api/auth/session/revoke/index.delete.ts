import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs } from '~/types/parser'
import { SessionRevokeResponse } from '~/types/auth'

export const ZodSessionRevokeResponse = z.object({
	success: z.boolean()
}) satisfies z.ZodType<SessionRevokeResponse>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/session/revoke/`,
			event,
			{
				method: 'DELETE'
			}
		)
		return await parseDataAs(response, ZodSessionRevokeResponse)
	} catch (error) {
		await handleError(error)
	}
})
