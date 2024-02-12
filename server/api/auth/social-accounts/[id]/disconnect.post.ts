import type { H3Event } from 'h3'
import { z } from 'zod'

import type {
	SocialAccountDisconnectResponse,
	SocialAccountDisconnectBody
} from '~/types/auth'

export const ZodSocialAccountDisconnectResponse = z.object({
	detail: z.string()
}) satisfies z.ZodType<SocialAccountDisconnectResponse>

export const ZodSocialAccountDisconnectBody = z.object({
	accessToken: z.string().nullish(),
	code: z.string().nullish(),
	idToken: z.string().nullish()
}) satisfies z.ZodType<SocialAccountDisconnectBody>

export default defineWrappedResponseHandler(async (event: H3Event) => {
	const config = useRuntimeConfig()
	try {
		const body = await parseBodyAs(event, ZodSocialAccountDisconnectBody)
		const response = await $api(
			`${config.public.apiBaseUrl}/auth/socialaccounts/${event.context.params?.id}/disconnect`,
			event,
			{
				body,
				method: 'POST'
			}
		)
		return await parseDataAs(response, ZodSocialAccountDisconnectResponse)
	} catch (error) {
		await handleError(error)
	}
})
