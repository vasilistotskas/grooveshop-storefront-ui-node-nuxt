import { resolveURL, withQuery } from 'ufo'
import { z } from 'zod'

import type { ProviderParams, ProviderSettings } from '~/types/auth'

export const ZodProviderParams = z.object({
  provider: z.enum(['google']),
}) satisfies z.ZodType<ProviderParams>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const params = await getValidatedRouterParams(event, ZodProviderParams.parse)
  const provider = params.provider

  const providerSettings = config?.auth?.oauth?.[
    provider
  ] as unknown as ProviderSettings

  if (!config?.auth?.oauth || !providerSettings) {
    throw createError({
      statusCode: 400,
      statusMessage: 'oauth-not-configured',
      data: {
        provider,
      },
      message: `OAuth provider "${provider}" is not configured`,
    })
  }

  try {
    const redirectUri = resolveURL(
      config.public.baseUrl,
      '/api/auth/login',
      provider,
      'callback',
    )

    const authorizationUrl = withQuery(providerSettings.authorizeUrl, {
      redirect_uri: redirectUri,
      prompt: 'consent',
      response_type: 'code',
      client_id: providerSettings.clientId,
      scope: providerSettings.scopes,
      access_type: 'offline',
    })

    await sendRedirect(event, authorizationUrl)
  }
  catch (error) {
    await handleError(error)
  }
})
