import type { H3Event } from 'h3'
import { z } from 'zod'

import type {
	MfaRecoveryCodesGenerateBody,
	MfaRecoveryCodesGenerateResponse
} from '~/types/auth'

export const ZodMfaRecoveryCodesGenerateResponse = z.object({
	codes: z.array(z.string()).nonempty()
}) satisfies z.ZodType<MfaRecoveryCodesGenerateResponse>

export const ZodMfaRecoveryCodesGenerateBody = z.object(
	{}
) satisfies z.ZodType<MfaRecoveryCodesGenerateBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodMfaRecoveryCodesGenerateBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/mfa/recovery-codes/generate/`,
			event,
			{
				body: JSON.stringify(body),
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodMfaRecoveryCodesGenerateResponse)
	} catch (error) {
		await handleError(error)
	}
})
