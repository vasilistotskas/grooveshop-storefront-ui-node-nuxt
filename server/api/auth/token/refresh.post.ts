import { z } from 'zod'

import type { TokenRefreshBody, TokenRefreshResponse } from '~/types/auth'

export const ZodTokenRefreshResponse = z.object({
  access: z.string().min(1),
  refresh: z.string().optional(),
  accessExpiration: z.string().min(1),
  refreshExpiration: z.string().optional(),
}) satisfies z.ZodType<TokenRefreshResponse>

export const ZodTokenRefreshBody = z.object({
  refresh: z.string().min(1),
}) satisfies z.ZodType<TokenRefreshBody>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(event, ZodTokenRefreshBody.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/token/refresh`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    const refreshResponse = await parseDataAs(response, ZodTokenRefreshResponse)
    await setUserSession(event, {
      token: refreshResponse.access,
      tokenExpiration: refreshResponse.accessExpiration,
      refreshToken: refreshResponse.refresh,
      refreshTokenExpiration: refreshResponse.refreshExpiration,
    })
    return refreshResponse
  }
  catch (error) {
    await clearUserSession(event)
    await handleError(error)
  }
})
