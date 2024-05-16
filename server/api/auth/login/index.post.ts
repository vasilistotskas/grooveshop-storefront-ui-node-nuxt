import { z } from 'zod'

import type { LoginBody, LoginResponse } from '~/types/auth'
import { ZodUserAccount } from '~/types/user/account'

export const ZodLoginResponse = z.object({
  access: z.string(),
  refresh: z.string().nullish(),
  accessExpiration: z.string(),
  refreshExpiration: z.string().nullish(),
  user: ZodUserAccount,
}) satisfies z.ZodType<LoginResponse>

export const ZodLoginBody = z.object({
  email: z.string(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
}) satisfies z.ZodType<LoginBody>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const validatedBody = await readValidatedBody(event, ZodLoginBody.parse)
    const { rememberMe, ...bodyWithoutRememberMe } = validatedBody
    const response = await $fetch(`${config.public.apiBaseUrl}/auth/login`, {
      body: bodyWithoutRememberMe,
      method: 'POST',
    })
    const loginResponse = await parseDataAs(response, ZodLoginResponse)

    await setUserSession(event, {
      user: loginResponse.user,
      token: loginResponse.access,
      refreshToken: loginResponse.refresh,
      tokenExpiration: loginResponse.accessExpiration,
      refreshTokenExpiration: loginResponse.refreshExpiration,
      loggedInAt: new Date(),
      rememberMe: rememberMe ?? false,
    })

    return loginResponse
  }
  catch (error) {
    await clearUserSession(event)
    await handleError(error)
  }
})
