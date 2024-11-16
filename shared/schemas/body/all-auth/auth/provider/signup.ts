import * as z from 'zod'

export const ZodProviderSignupBody = z.object({
  email: z.string().email().describe('The email address.'),
})
