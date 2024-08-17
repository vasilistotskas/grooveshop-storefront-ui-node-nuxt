import { z } from 'zod'
import { ZodAuthenticated, ZodAuthenticationMeta } from '~/types/all-auth'

export const ZodSignupBody = z.object({
  email: z.string().email().optional().describe('The email address.'),
  username: z.string().optional().describe('The username.'),
  password: z.string().describe('The password.'),
}).refine(data => data.email || data.username, {
  message: 'Either email or username must be provided',
  path: ['email', 'username'],
})

export const ZodSignupResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type SignupBody = z.infer<typeof ZodSignupBody>
export type SignupResponse = z.infer<typeof ZodSignupResponse>
