import type { H3Event } from 'h3'
import { z } from 'zod'

import type { MfaTotpActivatePostBody, MfaTotpActivatePostResponse } from '~/types/auth'

export const ZodMfaTotpActivatePostResponse = z.object({
	success: z.boolean()
}) satisfies z.ZodType<MfaTotpActivatePostResponse>

export const ZodMfaTotpActivatePostBody = z.object({
	code: z.string()
}) satisfies z.ZodType<MfaTotpActivatePostBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodMfaTotpActivatePostBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/mfa/totp/activate`,
			event,
			{
				body,
				method: 'POST'
			}
		)
		const activateResponse = await parseDataAs(response, ZodMfaTotpActivatePostResponse)
		event.context.totp_active = activateResponse.success
		setTotpActiveCookie(event, activateResponse.success)
		return activateResponse
	} catch (error) {
		event.context.totp_active = false
		deleteTotpActiveCookie(event)
		await handleError(error)
	}
})
