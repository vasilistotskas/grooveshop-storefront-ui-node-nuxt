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

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	const session = await getUserSession(event)
	try {
		const body = await readValidatedBody(event, ZodMfaRecoveryCodesGenerateBody.parse)
		const response = await $fetch(
			`${config.public.apiBaseUrl}/auth/mfa/recovery-codes/generate`,
			{
				method: 'POST',
				body,
				headers: {
					Authorization: `Bearer ${session?.token}`
				}
			}
		)
		return await parseDataAs(response, ZodMfaRecoveryCodesGenerateResponse)
	} catch (error) {
		await handleError(error)
	}
})
