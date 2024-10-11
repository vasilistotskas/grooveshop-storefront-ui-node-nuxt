import { object, string, literal, optional } from 'zod'
import { ZodAuthenticated, ZodAuthenticationMeta } from '~/types/all-auth'

export const ZodLoginBody = object({
  email: optional(string().email()).describe('The email address.'),
  username: optional(string()).describe('The username.'),
  password: string().describe('The password.'),
}).refine(data => data.email || data.username, {
  message: 'Either email or username must be provided',
  path: ['email', 'username'],
})

export const ZodLoginResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type Authenticated = typeof ZodAuthenticated._type
export type AuthenticationMeta = typeof ZodAuthenticationMeta._type
export type LoginBody = typeof ZodLoginBody._type
export type LoginResponse = typeof ZodLoginResponse._type
