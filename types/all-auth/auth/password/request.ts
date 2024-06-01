import { z } from 'zod'

export const ZodPasswordRequestResponse = z.object({
  status: z.literal(200),
})

export const ZodPasswordRequestBody = z.object({
  email: z.string().email().describe('The email address.'),
})

export type PasswordRequestBody = z.infer<typeof ZodPasswordRequestBody>
export type PasswordRequestResponse = z.infer<typeof ZodPasswordRequestResponse>
