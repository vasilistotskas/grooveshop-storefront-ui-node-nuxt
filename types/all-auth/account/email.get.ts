import { z } from 'zod'

const ZodEmailAddress = z.object({
  email: z.string().email().describe('The email address.'),
  primary: z.boolean(),
  verified: z.boolean(),
})

const ZodData = z.array(ZodEmailAddress)

export const ZodEmailGetResponse = z.object({
  status: z.number(),
  data: ZodData,
})

export type EmailGetResponse = z.infer<typeof ZodEmailGetResponse>
