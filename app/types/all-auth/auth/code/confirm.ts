import { object, string, literal } from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodCodeConfirmBody = object({
  code: string(),
})

export const ZodCodeConfirmResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type CodeConfirmBody = typeof ZodCodeConfirmBody._type
export type CodeConfirmResponse = typeof ZodCodeConfirmResponse._type
