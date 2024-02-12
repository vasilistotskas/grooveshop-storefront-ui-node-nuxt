import type { H3Event } from 'h3'
import { z } from 'zod'

import type { ProviderConnectResponse, ProviderConnectBody } from '~/types/auth'

export const ZodProviderConnectResponse = z.object({
	access: z.string(),
	refresh: z.string().nullable(),
	user: z.object({
		id: z.number(),
		email: z.string()
	})
}) satisfies z.ZodType<ProviderConnectResponse>

export const ZodProviderConnectBody = z.object({
	accessToken: z.string().nullish(),
	code: z.string().nullish(),
	idToken: z.string().nullish()
}) satisfies z.ZodType<ProviderConnectBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodProviderConnectBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/${event.context.params?.provider}/connect`,
			event,
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
