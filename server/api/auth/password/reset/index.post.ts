import type { H3Event } from 'h3'
import { z } from 'zod'

import type { PasswordResetBody, PasswordResetResponse } from '~/types/auth'

export const ZodPasswordResetResponse = z.object({
  detail: z.string(),
}) satisfies z.ZodType<PasswordResetResponse>

export const ZodPasswordResetBody = z.object({
  email: z.string(),
}) satisfies z.ZodType<PasswordResetBody>

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, ZodPasswordResetBody.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/password/reset`,
      {
        body,
        method: 'POST',
      },
    )
    return await parseDataAs(response, ZodPasswordResetResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
