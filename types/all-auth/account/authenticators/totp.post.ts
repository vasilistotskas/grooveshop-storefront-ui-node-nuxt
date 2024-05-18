import { z } from 'zod'

const ZodTOTPAuthenticator = z.object({
  last_used_at: z.number().optional().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  created_at: z.number().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  type: z.literal('totp'),
})

export const ZodTotpPostBody = z.object({
  code: z.string().describe('An authenticator code.'),
})

export const ZodTotpPostResponse = z.object({
  status: z.number(),
  data: ZodTOTPAuthenticator,
})

export type TotpPostBody = z.infer<typeof ZodTotpPostBody>
export type TotpPostResponse = z.infer<typeof ZodTotpPostResponse>
