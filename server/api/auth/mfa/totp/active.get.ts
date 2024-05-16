import { z } from 'zod'

import type { MfaTotpActiveResponse } from '~/types/auth'

export const ZodMfaTotpActiveResponse = z.object({
  active: z.boolean(),
}) satisfies z.ZodType<MfaTotpActiveResponse>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  try {
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/mfa/totp/active`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    const activeResponse = await parseDataAs(response, ZodMfaTotpActiveResponse)
    await setUserSession(event, {
      totpActive: activeResponse.active,
    })
    return activeResponse
  }
  catch (error) {
    await setUserSession(event, {
      totpActive: false,
    })
    await handleError(error)
  }
})
