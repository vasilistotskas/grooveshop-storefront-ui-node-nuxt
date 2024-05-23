import { z } from 'zod'
import { ZodAuthenticationMeta, ZodMethods, ZodUser } from '~/types/all-auth'

const ZodAuthenticated = z.object({
  user: ZodUser,
  methods: ZodMethods,
})

export const ZodLoginBody = z.object({
  email: z.string().email().optional().describe('The email address.'),
  username: z.string().optional().describe('The username.'),
  password: z.string().describe('The password.'),
}).refine(data => data.email || data.username, {
  message: 'Either email or username must be provided',
  path: ['email', 'username'],
})

export const ZodLoginResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type Authenticated = z.infer<typeof ZodAuthenticated>
export type AuthenticationMeta = z.infer<typeof ZodAuthenticationMeta>
export type LoginBody = z.infer<typeof ZodLoginBody>
export type LoginResponse = z.infer<typeof ZodLoginResponse>
