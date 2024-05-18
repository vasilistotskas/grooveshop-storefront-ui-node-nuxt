import { z } from 'zod'

const ZodTOTPAuthenticator = z.object({
  last_used_at: z.number().optional().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  created_at: z.number().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  type: z.literal('totp'),
})

export const ZodTotpGetResponse = z.object({
  status: z.number(),
  data: ZodTOTPAuthenticator,
})

export type TotpGetResponse = z.infer<typeof ZodTotpGetResponse>
