import type { H3Event } from 'h3'
import { z } from 'zod'

import type { ProviderLoginResponse, ProviderLoginBody } from '~/types/auth'

export const ZodProviderLoginResponse = z.object({
	access: z.string(),
	refresh: z.string().nullish(),
	user: z.object({
		id: z.number(),
		email: z.string()
	})
}) satisfies z.ZodType<ProviderLoginResponse>

export const ZodProviderLoginBody = z.object({
	accessToken: z.string().nullish(),
	code: z.string().nullish(),
	idToken: z.string().nullish()
}) satisfies z.ZodType<ProviderLoginBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodProviderLoginBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/${event.context.params?.provider}/connect`,
			event,
			{
				body,
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodProviderLoginResponse)
	} catch (error) {
		await handleError(error)
	}
})
