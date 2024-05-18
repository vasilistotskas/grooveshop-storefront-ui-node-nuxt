import { z } from 'zod'

export const ZodEmailPutResponse = z.object({
  status: z.number(),
})

export const ZodEmailPutBody = z.object({
  email: z.string().email().describe('An email address.'),
})

export type EmailPutBody = z.infer<typeof ZodEmailPutBody>
export type EmailPutResponse = z.infer<typeof ZodEmailPutResponse>
