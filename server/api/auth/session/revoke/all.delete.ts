import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs } from '~/types/parser'
import { SessionRevokeAllResponse } from '~/types/auth'

export const ZodSessionRevokeAllResponse = z.object({
	success: z.boolean()
}) satisfies z.ZodType<SessionRevokeAllResponse>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/session/revoke/all/`,
			event,
			{
				method: 'DELETE'
			}
		)
		return await parseDataAs(response, ZodSessionRevokeAllResponse)
	} catch (error) {
		await handleError(error)
	}
})
