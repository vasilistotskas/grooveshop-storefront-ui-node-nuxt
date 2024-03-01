import type { H3Event } from 'h3'
import { z } from 'zod'

import type { ProviderConnectBody, ProviderConnectResponse } from '~/types/auth'
import { ZodUserAccount } from '~/types/user/account'

export const ZodProviderConnectResponse = z.object({
	access: z.string(),
	refresh: z.string().nullable(),
	user: ZodUserAccount
}) satisfies z.ZodType<ProviderConnectResponse>

export const ZodProviderConnectBody = z.object({
	accessToken: z.string().nullish(),
	code: z.string().nullish(),
	idToken: z.string().nullish()
}) satisfies z.ZodType<ProviderConnectBody>

export default defineEventHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await readValidatedBody(event, ZodProviderConnectBody.parse)
		const response = await $fetch(
			`${config.public.apiBaseUrl}/auth/${event.context.params?.provider}/connect`,
			{
				body,
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodProviderConnectResponse)
	} catch (error) {
		await handleError(error)
	}
})
