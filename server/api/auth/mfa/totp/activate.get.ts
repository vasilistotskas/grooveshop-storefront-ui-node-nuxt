import type { H3Event } from 'h3'
import { z } from 'zod'

import type { MfaTotpActivateGetResponse } from '~/types/auth'

export const ZodMfaTotpActivateGetResponse = z.object({
	totpSvg: z.string(),
	secret: z.string()
}) satisfies z.ZodType<MfaTotpActivateGetResponse>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/mfa/totp/activate/`,
			event,
			{
				method: 'GET'
			}
		)
		return parseDataAs(response, ZodMfaTotpActivateGetResponse)
	} catch (error) {
		await handleError(error)
	}
})
