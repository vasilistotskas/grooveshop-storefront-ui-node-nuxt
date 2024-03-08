import type { H3Event } from 'h3'
import { z } from 'zod'

import type {
  SocialAccountDisconnectBody,
  SocialAccountDisconnectResponse,
} from '~/types/auth'

export const ZodSocialAccountDisconnectResponse = z.object({
  detail: z.string(),
}) satisfies z.ZodType<SocialAccountDisconnectResponse>

export const ZodSocialAccountDisconnectBody = z.object({
  accessToken: z.string().nullish(),
  code: z.string().nullish(),
  idToken: z.string().nullish(),
}) satisfies z.ZodType<SocialAccountDisconnectBody>

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(
      event,
      ZodSocialAccountDisconnectBody.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/socialaccounts/${event.context.params?.id}/disconnect`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return await parseDataAs(response, ZodSocialAccountDisconnectResponse)
  } catch (error) {
    await handleError(error)
  }
})
