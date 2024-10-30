import * as z from 'zod'
import { ZodEmailAddress } from '~/types/all-auth'

const ZodData = z.array(ZodEmailAddress)

export const ZodEmailGetResponse = z.object({
  status: z.literal(200),
  data: ZodData,
})

export type EmailGetResponse = z.infer<typeof ZodEmailGetResponse>
