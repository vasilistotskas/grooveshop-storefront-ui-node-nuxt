import { object, string, optional } from 'zod'

export const ZodPasswordChangeBody = object({
  current_password: optional(string().describe('The password.')),
  new_password: string().describe('The current password.'),
})

export type PasswordChangeBody = typeof ZodPasswordChangeBody._type
