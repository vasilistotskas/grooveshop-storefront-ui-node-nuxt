import type { H3Event } from 'h3'
import { z } from 'zod'

import type { LogoutBody, LogoutResponse } from '~/types/auth'

export const ZodLogoutResponse = z.object({
  detail: z.string().min(1),
}) satisfies z.ZodType<LogoutResponse>

export const ZodLogoutBody = z.object({
  refresh: z.string().optional(),
}) satisfies z.ZodType<LogoutBody>

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  try {
    const body = await readValidatedBody(event, ZodLogoutBody.parse)
    const response = await $fetch(`${config.public.apiBaseUrl}/auth/logout`, {
      method: 'POST',
      body,
    })
    await clearUserSession(event)
    return await parseDataAs(response, ZodLogoutResponse)
  }
  catch (error) {
    await clearUserSession(event)
    await handleError(error)
  }
})
