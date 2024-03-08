import type { H3Event } from 'h3'
import { z } from 'zod'

import type {
  PasswordResetConfirmBody,
  PasswordResetConfirmResponse,
} from '~/types/auth'

export const ZodPasswordResetConfirmResponse = z.object({
  detail: z.string(),
}) satisfies z.ZodType<PasswordResetConfirmResponse>

export const ZodPasswordResetConfirmBody = z.object({
  newPassword1: z.string(),
  newPassword2: z.string(),
  uid: z.string(),
  token: z.string(),
}) satisfies z.ZodType<PasswordResetConfirmBody>

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(
      event,
      ZodPasswordResetConfirmBody.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/password/reset/confirm`,
      {
        body,
        method: 'POST',
      },
    )
    return await parseDataAs(response, ZodPasswordResetConfirmResponse)
  } catch (error) {
    await handleError(error)
  }
})
