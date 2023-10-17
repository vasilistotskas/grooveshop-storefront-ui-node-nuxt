import { H3Event } from 'h3'
import { z } from 'zod'
import { parseDataAs, parseBodyAs } from '~/types/parser'
import { MfaTotpAuthenticateBody, MfaTotpAuthenticateResponse } from '~/types/auth'

export const ZodMfaTotpAuthenticateResponse = z.object({
	success: z.boolean()
}) satisfies z.ZodType<MfaTotpAuthenticateResponse>

export const ZodMfaTotpAuthenticateBody = z.object({
	code: z.string()
}) satisfies z.ZodType<MfaTotpAuthenticateBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodMfaTotpAuthenticateBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/mfa/totp/authenticate/`,
			event,
			{
				body: JSON.stringify(body),
				method: 'POST'
			}
		)
		const authenticateResponse = await parseDataAs(
			response,
			ZodMfaTotpAuthenticateResponse
		)
		event.context.totp_authenticated = authenticateResponse.success
		setTotpActiveCookie(event, authenticateResponse.success)
		return authenticateResponse
	} catch (error) {
		event.context.totp_authenticated = false
		setTotpActiveCookie(event, false)
		await handleError(error)
	}
})
