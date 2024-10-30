import * as z from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodCodeConfirmBody = z.object({
  code: z.string(),
})

export const ZodCodeConfirmResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type CodeConfirmBody = z.infer<typeof ZodCodeConfirmBody>
export type CodeConfirmResponse = z.infer<typeof ZodCodeConfirmResponse>
