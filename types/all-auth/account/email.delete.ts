import { z } from 'zod'

const ZodEmailAddress = z.object({
  email: z.string().email().describe('The email address.'),
  primary: z.boolean(),
  verified: z.boolean(),
})

const ZodData = z.array(ZodEmailAddress)

export const ZodEmailDeleteResponse = z.object({
  status: z.number(),
  data: ZodData,
})

export const ZodEmailDeleteBody = z.object({
  email: z.string().email().describe('An email address.'),
})

export type EmailDeleteBody = z.infer<typeof ZodEmailDeleteBody>
export type EmailDeleteResponse = z.infer<typeof ZodEmailDeleteResponse>
