import { z } from 'zod'
import { ZodTOTPAuthenticator } from '~/types/all-auth'

export const ZodTotpPostBody = z.object({
  code: z.string().describe('An authenticator code.'),
})

export const ZodTotpPostResponse = z.object({
  status: z.literal(200),
  data: ZodTOTPAuthenticator,
})

export type TotpPostBody = z.infer<typeof ZodTotpPostBody>
export type TotpPostResponse = z.infer<typeof ZodTotpPostResponse>
