import type { H3Event } from 'h3'
import { z } from 'zod'

import type {
  IsUserRegisteredBody,
  IsUserRegisteredResponse,
} from '~/types/auth'

export const ZodIsUserRegisteredBody = z.object({
  email: z.string(),
}) as z.ZodType<IsUserRegisteredBody>

export const ZodIsUserRegisteredResponse = z.object({
  registered: z.boolean(),
}) as z.ZodType<IsUserRegisteredResponse>

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(event, ZodIsUserRegisteredBody.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/is_user_registered`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return parseDataAs(response, ZodIsUserRegisteredResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
