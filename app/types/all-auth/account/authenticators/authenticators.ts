import { object, number, string, boolean, array, enum as zEnum, optional, literal } from 'zod'

export const ZodAuthenticator = object({
  id: optional(number()).describe('The unique identifier for the authenticator.'),
  name: optional(string()).describe('The name of the authenticator.'),
  last_used_at: number().nullable().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  created_at: number().describe('An epoch based timestamp (trivial to parse using: new Date(value)*1000)'),
  type: zEnum(['totp', 'recovery_codes', 'webauthn']),
  total_code_count: optional(number()).describe('The total number of recovery codes that initially were available.'),
  unused_code_count: optional(number()).describe('The number of recovery codes that are unused.'),
  is_passwordless: optional(boolean()).describe('Whether the authenticator is passwordless.'),
})

export const ZodAuthenticatorsResponse = object({
  status: literal(200),
  data: array(ZodAuthenticator),
})

export type AuthenticatorsResponse = typeof ZodAuthenticatorsResponse._type
