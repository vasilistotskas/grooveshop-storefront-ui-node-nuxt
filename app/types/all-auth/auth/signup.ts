import { object, string, literal, optional } from 'zod'
import { ZodAuthenticated, ZodAuthenticationMeta } from '~/types/all-auth'

export const ZodSignupBody = object({
  email: optional(string().email()).describe('The email address.'),
  username: optional(string()).describe('The username.'),
  password: string().describe('The password.'),
}).refine(data => data.email || data.username, {
  message: 'Either email or username must be provided',
  path: ['email', 'username'],
})

export const ZodSignupResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type SignupBody = typeof ZodSignupBody._type
export type SignupResponse = typeof ZodSignupResponse._type
