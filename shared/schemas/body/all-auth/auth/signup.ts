import * as z from 'zod'

export const ZodSignupBody = z.object({
  email: z.string().email().optional().describe('The email address.'),
  username: z.string().optional().describe('The username.'),
  password: z.string().describe('The password.'),
}).refine(data => data.email || data.username, {
  message: 'Either email or username must be provided',
  path: ['email', 'username'],
})
