import type { H3Event } from 'h3'
import { z } from 'zod'

import type { MfaRecoveryCodesListResponse } from '~/types/auth'

export const ZodMfaRecoveryCodesListResponse = z.object({
  unusedCodes: z.array(z.string()).nonempty(),
  totalCount: z.number().int().positive(),
}) satisfies z.ZodType<MfaRecoveryCodesListResponse>

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const response = await $fetch(
      `${config.public.apiBaseUrl}/auth/mfa/recovery-codes/list`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      },
    )
    return parseDataAs(response, ZodMfaRecoveryCodesListResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
