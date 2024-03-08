import { withQuery } from 'ufo'
import { z } from 'zod'

import { ZodProviderLoginResponse } from '~/server/api/auth/login/[provider]/login.post'
import type {
  ProviderCallbackBody,
  ProviderCallbackParams,
  ProviderSettings,
} from '~/types/auth'

export const ZodProviderCallbackBody = z.object({
  code: z.string(),
  state: z.string().nullish(),
}) satisfies z.ZodType<ProviderCallbackBody>

export const ZodProviderCallbackParams = z.object({
  provider: z.enum(['google']),
}) satisfies z.ZodType<ProviderCallbackParams>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  try {
    const params = await getValidatedRouterParams(
      event,
      ZodProviderCallbackParams.parse,
    )
    const provider = params.provider
    const providerSettings = config?.auth?.oauth?.[
      provider
    ] as unknown as ProviderSettings

    const { state: returnToPath, code } = await getValidatedQuery(
      event,
      ZodProviderCallbackBody.parse,
    )

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

    const googleLoginResponse = await $fetch(
      `${config.public.apiBaseUrl}/auth/google/login`,
      {
        body: JSON.stringify({
          code,
        }),
        method: 'POST',
      },
    )
    const auth = await parseDataAs(
      googleLoginResponse,
      ZodProviderLoginResponse,
    )

    if (auth.refresh) {
      await setUserSession(event, {
        refreshToken: auth.refresh,
        loggedInAt: new Date(),
      })
    }

    await sendRedirect(event, withQuery('/account', { redirect: returnToPath }))
  } catch (error) {
    await handleError(error, {
      event,
      url: '/auth/login',
    })
  }
})
