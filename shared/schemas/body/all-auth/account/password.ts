import * as z from 'zod'

export const ZodPasswordChangeBody = z.object({
  current_password: z.string().describe('The password.').optional(),
  new_password: z.string().describe('The current password.'),
})
