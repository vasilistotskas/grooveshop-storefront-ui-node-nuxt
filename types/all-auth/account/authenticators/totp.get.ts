import { z } from 'zod'
import { ZodTOTPAuthenticator } from '~/types/all-auth'

export const ZodTotpGetResponse = z.object({
  status: z.literal(200),
  data: ZodTOTPAuthenticator,
})

export type TotpGetResponse = z.infer<typeof ZodTotpGetResponse>
