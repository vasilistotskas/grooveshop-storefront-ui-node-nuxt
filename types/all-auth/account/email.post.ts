import { z } from 'zod'

const ZodEmailAddress = z.object({
  email: z.string().email().describe('The email address.'),
  primary: z.boolean(),
  verified: z.boolean(),
})

const ZodData = z.array(ZodEmailAddress)

export const ZodEmailPostBody = z.object({
  email: z.string().email().describe('An email address.'),
})

export const ZodEmailPostResponse = z.object({
  status: z.number(),
  data: ZodData,
})

export type EmailPostBody = z.infer<typeof ZodEmailPostBody>
export type EmailPostResponse = z.infer<typeof ZodEmailPostResponse>
