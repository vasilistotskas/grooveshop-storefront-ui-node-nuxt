import type { H3Event } from 'h3'
import { z } from 'zod'

import type { MfaTotpDeactivateBody, MfaTotpDeactivateResponse } from '~/types/auth'

export const ZodMfaTotpDeactivateResponse = z.object({
	success: z.boolean()
}) satisfies z.ZodType<MfaTotpDeactivateResponse>

export const ZodMfaTotpDeactivateBody = z.object(
	{}
) satisfies z.ZodType<MfaTotpDeactivateBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodMfaTotpDeactivateBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/mfa/totp/deactivate`,
			event,
			{
				body,
				method: 'POST'
			}
		)
		const deactivateResponse = await parseDataAs(response, ZodMfaTotpDeactivateResponse)
		deleteTotpActiveCookie(event)
		event.context.totp_active = false
		return deactivateResponse
	} catch (error) {
		deleteTotpActiveCookie(event)
		event.context.totp_active = false
		await handleError(error)
	}
})
