import * as z from 'zod'
import { ZodUser } from '~/types/all-auth'

const ZodData = z.object({
  email: z.string().email(),
  user: ZodUser,
})

const ZodEmailVerifyMeta = z.object({
  is_authenticating: z.boolean().optional(),
})

export const ZodEmailVerifyGetResponse = z.object({
  status: z.literal(200),
  data: ZodData,
  meta: ZodEmailVerifyMeta,
})

export type EmailVerifyGetResponse = z.infer<typeof ZodEmailVerifyGetResponse>
