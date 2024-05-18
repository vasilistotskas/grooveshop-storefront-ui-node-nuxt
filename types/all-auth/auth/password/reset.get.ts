import { z } from 'zod'

const ZodUser = z.object({
  id: z.union([z.string(), z.number()]).describe('The user ID.'),
  display: z.string().optional().describe('The display name for the user.'),
  has_usable_password: z.boolean().optional().describe('Whether or not the account has a password set.'),
  email: z.string().email().optional().describe('The email address.'),
  username: z.string().optional().describe('The username.'),
})

const ZodData = z.object({
  user: ZodUser,
})

export const ZodPasswordResetGetResponse = z.object({
  status: z.number(),
  data: ZodData,
})

export type PasswordResetGetResponse = z.infer<typeof ZodPasswordResetGetResponse>
