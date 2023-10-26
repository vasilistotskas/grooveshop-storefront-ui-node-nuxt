import type { H3Event } from 'h3'
import { z } from 'zod'

import type { MfaTotpActiveResponse } from '~/types/auth'

export const ZodMfaTotpActiveResponse = z.object({
	active: z.boolean()
}) satisfies z.ZodType<MfaTotpActiveResponse>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/mfa/totp/active/`,
			event,
			{
				method: 'GET'
			}
		)
		const activeResponse = await parseDataAs(response, ZodMfaTotpActiveResponse)
		event.context.totp_active = activeResponse.active
		setTotpActiveCookie(event, activeResponse.active)
		return activeResponse
	} catch (error) {
		setTotpActiveCookie(event, false)
		await handleError(error)
	}
})
