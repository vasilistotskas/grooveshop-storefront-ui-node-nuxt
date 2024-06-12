import { z } from 'zod'
import { ZodEmailAddress } from '~/types/all-auth'

const ZodData = z.array(ZodEmailAddress)

export const ZodEmailDeleteResponse = z.object({
  status: z.literal(200),
  data: ZodData,
})

export const ZodEmailDeleteBody = z.object({
  email: z.string().email().describe('An email address.'),
})

export type EmailDeleteBody = z.infer<typeof ZodEmailDeleteBody>
export type EmailDeleteResponse = z.infer<typeof ZodEmailDeleteResponse>
