import * as z from 'zod'
import { ZodEmailAddress } from '~/types/all-auth'

const ZodData = z.array(ZodEmailAddress)

export const ZodEmailPatchResponse = z.object({
  status: z.literal(200),
  data: ZodData,
})

export const ZodEmailPatchBody = z.object({
  email: z.string().email().describe('An email address.'),
  primary: z.boolean().describe('Primary flag.'),
})

export type EmailPatchBody = z.infer<typeof ZodEmailPatchBody>
export type EmailPatchResponse = z.infer<typeof ZodEmailPatchResponse>
