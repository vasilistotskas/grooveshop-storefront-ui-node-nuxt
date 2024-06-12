import { z } from 'zod'
import { ZodEmailAddress } from '~/types/all-auth'

const ZodData = z.array(ZodEmailAddress)

export const ZodEmailPostBody = z.object({
  email: z.string().email().describe('An email address.'),
})

export const ZodEmailPostResponse = z.object({
  status: z.literal(200),
  data: ZodData,
})

export type EmailPostBody = z.infer<typeof ZodEmailPostBody>
export type EmailPostResponse = z.infer<typeof ZodEmailPostResponse>
