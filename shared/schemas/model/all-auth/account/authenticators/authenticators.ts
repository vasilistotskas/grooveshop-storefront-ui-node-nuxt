import * as z from 'zod'

export const ZodAuthenticator = z.object({
  id: z.number().optional().describe('The unique identifier for the authenticator.'),
  name: z.string().optional().describe('The name of the authenticator.'),
  last_used_at: z.number().nullable().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  created_at: z.number().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  type: z.enum(['totp', 'recovery_codes', 'webauthn']),
  total_code_count: z.number().optional().describe('The total number of recovery codes that initially were available.'),
  unused_code_count: z.number().optional().describe('The number of recovery codes that are unused.'),
  is_passwordless: z.boolean().optional().describe('Whether the authenticator is passwordless.'),
})
