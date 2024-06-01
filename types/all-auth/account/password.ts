import { z } from 'zod'

export const ZodPasswordChangeBody = z.object({
  current_password: z.string().describe('The password.'),
  new_password: z.string().describe('The current password.'),
})

export type PasswordChangeBody = z.infer<typeof ZodPasswordChangeBody>
