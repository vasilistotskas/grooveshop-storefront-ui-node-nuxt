import { z } from 'zod'
import { ZodUser } from '~/types/all-auth'

const ZodData = z.object({
  user: ZodUser,
})

export const ZodPasswordResetGetResponse = z.object({
  status: z.literal(200),
  data: ZodData,
})

export type PasswordResetGetResponse = z.infer<typeof ZodPasswordResetGetResponse>
