import { z } from 'zod'

import type { ProviderLoginBody, ProviderLoginResponse } from '~/types/auth'
import { ZodUserAccount } from '~/types/user/account'

export const ZodProviderLoginResponse = z.object({
  access: z.string(),
  refresh: z.string().nullish(),
  user: ZodUserAccount,
}) satisfies z.ZodType<ProviderLoginResponse>

export const ZodProviderLoginBody = z.object({
  accessToken: z.string().nullish(),
  code: z.string().nullish(),
  idToken: z.string().nullish(),
}) satisfies z.ZodType<ProviderLoginBody>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, ZodProviderLoginBody.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/${event.context.params?.provider}/connect`,
      {
        body,
        method: 'POST',
      },
    )
    const loginResponse = await parseDataAs(response, ZodProviderLoginResponse)
    await setUserSession(event, {
      user: loginResponse.user,
      token: loginResponse.access,
      refreshToken: loginResponse.refresh,
      loggedInAt: new Date(),
    })
    return loginResponse
  }
  catch (error) {
    await handleError(error)
  }
})
