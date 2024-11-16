import * as z from 'zod'

export const ZodSensitiveRecoveryCodesAuthenticator = z.object({
  last_used_at: z.number().nullable().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  created_at: z.number().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  type: z.literal('recovery_codes').describe('The authenticator type.'),
  total_code_count: z.number().describe('The total number of recovery codes that initially were available.'),
  unused_code_count: z.number().optional().describe('The number of recovery codes that are unused.'),
  unused_codes: z.array(z.string()).describe('The list of unused codes.'),
})
