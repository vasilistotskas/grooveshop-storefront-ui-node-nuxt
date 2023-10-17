import { H3Event } from 'h3'
import { z } from 'zod'

import { parseDataAs } from '~/types/parser'
import { MfaRecoveryCodesListResponse } from '~/types/auth'

export const ZodMfaRecoveryCodesListResponse = z.object({
	unusedCodes: z.array(z.string()).nonempty(),
	totalCount: z.number().int().positive()
}) satisfies z.ZodType<MfaRecoveryCodesListResponse>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/mfa/recovery-codes/list/`,
			event,
			{
				method: 'GET'
			}
		)
		return parseDataAs(response, ZodMfaRecoveryCodesListResponse)
	} catch (error) {
		await handleError(error)
	}
})
