import { z } from 'zod'

const ZodEmailAddress = z.object({
  email: z.string().email().describe('The email address.'),
  primary: z.boolean(),
  verified: z.boolean(),
})

const ZodData = z.array(ZodEmailAddress)

export const ZodEmailPatchResponse = z.object({
  status: z.number(),
  data: ZodData,
})

export const ZodEmailPatchBody = z.object({
  email: z.string().email().describe('An email address.'),
  primary: z.boolean().describe('Primary flag.'),
})

export type EmailPatchBody = z.infer<typeof ZodEmailPatchBody>
export type EmailPatchResponse = z.infer<typeof ZodEmailPatchResponse>
