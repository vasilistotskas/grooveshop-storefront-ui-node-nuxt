import * as z from 'zod'

export const ZodCodeRequestBody = z.object({
  email: z.string().email().describe('The email address.'),
})

export type CodeRequestBody = z.infer<typeof ZodCodeRequestBody>
