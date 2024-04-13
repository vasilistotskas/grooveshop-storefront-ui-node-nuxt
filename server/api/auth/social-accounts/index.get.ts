import type { H3Event } from 'h3'
import { z } from 'zod'

import type { Provider, SocialAccount } from '~/types/auth'

export const ZodProvider = z.object({
  google: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    scopes: z.string(),
    authorizeUrl: z.string(),
    tokenUrl: z.string(),
    userUrl: z.string(),
  }),
}) satisfies z.ZodType<Provider>

export const ZodSocialAccountResponse = z.array(
  z.object({
    id: z.number(),
    provider: ZodProvider,
    uid: z.string(),
    lastLogin: z.string(),
    dateJoined: z.string(),
  }),
) satisfies z.ZodType<SocialAccount[]>

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/socialaccounts`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, ZodSocialAccountResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
