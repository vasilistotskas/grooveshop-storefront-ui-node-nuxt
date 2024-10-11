import { object, number, literal, array, string, optional } from 'zod'

const ZodSensitiveRecoveryCodesAuthenticator = object({
  last_used_at: number().nullable().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  created_at: number().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  type: literal('recovery_codes').describe('The authenticator type.'),
  total_code_count: number().describe('The total number of recovery codes that initially were available.'),
  unused_code_count: optional(number()).describe('The number of recovery codes that are unused.'),
  unused_codes: array(string()).describe('The list of unused codes.'),
})

export const ZodRecoveryCodesGetResponse = object({
  status: literal(200),
  data: ZodSensitiveRecoveryCodesAuthenticator,
})

export type RecoveryCodesGetResponse = typeof ZodRecoveryCodesGetResponse._type
