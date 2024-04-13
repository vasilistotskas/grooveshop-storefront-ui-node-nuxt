import type { H3Event } from 'h3'
import { z } from 'zod'

import type {
  MfaTotpActivatePostBody,
  MfaTotpActivatePostResponse,
} from '~/types/auth'

export const ZodMfaTotpActivatePostResponse = z.object({
  success: z.boolean(),
}) satisfies z.ZodType<MfaTotpActivatePostResponse>

export const ZodMfaTotpActivatePostBody = z.object({
  code: z.string(),
}) satisfies z.ZodType<MfaTotpActivatePostBody>

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  try {
    const body = await readValidatedBody(
      event,
      ZodMfaTotpActivatePostBody.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/mfa/totp/activate`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    const activateResponse = await parseDataAs(
      response,
      ZodMfaTotpActivatePostResponse,
    )
    await setUserSession(event, {
      totpActive: activateResponse.success,
    })
    return activateResponse
  }
  catch (error) {
    await setUserSession(event, {
      totpActive: false,
    })
    await handleError(error)
  }
})
