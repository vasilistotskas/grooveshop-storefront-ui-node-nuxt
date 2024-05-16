import { z } from 'zod'

import type { MfaTotpDeactivateBody, MfaTotpDeactivateResponse } from '~/types/auth'

export const ZodMfaTotpDeactivateResponse = z.object({
  success: z.boolean(),
}) satisfies z.ZodType<MfaTotpDeactivateResponse>

export const ZodMfaTotpDeactivateBody = z.object(
  {},
) satisfies z.ZodType<MfaTotpDeactivateBody>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  try {
    const body = await readValidatedBody(event, ZodMfaTotpDeactivateBody.parse)
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/mfa/totp/deactivate`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    const deactivateResponse = await parseDataAs(
      response,
      ZodMfaTotpDeactivateResponse,
    )
    await setUserSession(event, {
      totpActive: false,
    })
    return deactivateResponse
  }
  catch (error) {
    await handleError(error)
  }
})
