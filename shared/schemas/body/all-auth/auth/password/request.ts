import * as z from 'zod'

export const ZodPasswordRequestBody = z.object({
  email: z.string().email().describe('The email address.'),
})
