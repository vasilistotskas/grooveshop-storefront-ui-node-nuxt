import { z } from 'zod'

import type { RegistrationBody, RegistrationResponse } from '~/types/auth'
import { ZodUserAccount } from '~/types/user/account'

export const ZodRegistrationResponse = z.object({
  detail: z.string().nullish(),
  access: z.string().nullish(),
  refresh: z.string().nullish(),
  user: ZodUserAccount.nullish(),
}) satisfies z.ZodType<RegistrationResponse>

export const ZodRegistrationBody = z.object({
  email: z.string().email(),
  password1: z.string().min(1),
  password2: z.string().min(1),
}) satisfies z.ZodType<RegistrationBody>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, ZodRegistrationBody.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/registration`,
      {
        body,
        method: 'POST',
      },
    )
    const registrationResponse = await parseDataAs(
      response,
      ZodRegistrationResponse,
    )
    await setUserSession(event, {
      user: registrationResponse.user ?? undefined,
      token: registrationResponse.access,
      refreshToken: registrationResponse.refresh,
    })
    return registrationResponse
  }
  catch (error) {
    await handleError(error)
  }
})
