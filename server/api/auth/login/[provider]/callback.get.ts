import { z } from 'zod'
import { withQuery } from 'ufo'
import { parseDataAs, parseParamsAs, parseQueryAs } from '~/types/parser'
import {
	ProviderCallbackBody,
	ProviderCallbackParams,
	ProviderSettings
} from '~/types/auth'
import { ZodProviderLoginResponse } from '~/server/api/auth/login/[provider]/login.post'

export const ZodProviderCallbackBody = z.object({
	code: z.string(),
	state: z.string().nullish()
}) satisfies z.ZodType<ProviderCallbackBody>

export const ZodProviderCallbackParams = z.object({
	provider: z.enum(['google'])
}) satisfies z.ZodType<ProviderCallbackParams>

export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig()

	try {
		if (!config.public.auth.redirect.callback) {
			throw createError({
				statusCode: 400,
				statusMessage: 'Please make sure to set callback redirect path',
				message: 'Please make sure to set callback redirect path'
			})
		}

		const params = parseParamsAs(event, ZodProviderCallbackParams)
		const provider = params.provider
		const providerSettings = config.auth.oauth[provider] as unknown as ProviderSettings

		const { state: returnToPath, code } = parseQueryAs(event, ZodProviderCallbackBody)

		if (!config.auth.oauth || !providerSettings) {
			throw createError({
				statusCode: 400,
				statusMessage: 'oauth-not-configured',
				data: {
					provider
				},
				message: `OAuth provider "${provider}" is not configured`
			})
		}

		const googleLoginResponse = await $api(
			`${config.public.apiBaseUrl}/auth/google/login/`,
			event,
			{
				body: JSON.stringify({
					code
				}),
				method: 'POST'
			}
		)
		const auth = await parseDataAs(googleLoginResponse, ZodProviderLoginResponse)

		if (auth.refresh) {
			setRefreshTokenCookie(event, auth.refresh)
		}

		await sendRedirect(
			event,
			withQuery(config.public.auth.redirect.callback, { redirect: returnToPath })
		)
	} catch (error) {
		await handleError(error, {
			event,
			url: config.public.auth.redirect.callback
		})
	}
})
