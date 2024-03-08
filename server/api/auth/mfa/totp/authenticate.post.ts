import type { H3Event } from 'h3'
import { z } from 'zod'

import type {
  MfaTotpAuthenticateBody,
  MfaTotpAuthenticateResponse,
} from '~/types/auth'

export const ZodMfaTotpAuthenticateResponse = z.object({
  success: z.boolean(),
}) satisfies z.ZodType<MfaTotpAuthenticateResponse>

export const ZodMfaTotpAuthenticateBody = z.object({
  code: z.string(),
}) satisfies z.ZodType<MfaTotpAuthenticateBody>

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  try {
    const body = await readValidatedBody(
      event,
      ZodMfaTotpAuthenticateBody.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/mfa/totp/authenticate`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    const authenticateResponse = await parseDataAs(
      response,
      ZodMfaTotpAuthenticateResponse,
    )
    await setUserSession(event, {
      totpAuthenticated: authenticateResponse.success,
    })
    return authenticateResponse
  } catch (error) {
    await setUserSession(event, {
      totpAuthenticated: false,
    })
    await handleError(error)
  }
})
