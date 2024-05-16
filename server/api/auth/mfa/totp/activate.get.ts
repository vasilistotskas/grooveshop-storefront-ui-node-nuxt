import { z } from 'zod'

import type { MfaTotpActivateGetResponse } from '~/types/auth'

export const ZodMfaTotpActivateGetResponse = z.object({
  totpSvg: z.string(),
  secret: z.string(),
}) satisfies z.ZodType<MfaTotpActivateGetResponse>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  try {
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/mfa/totp/activate`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return parseDataAs(response, ZodMfaTotpActivateGetResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
