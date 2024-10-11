import { object, literal } from 'zod'

export const ZodTotpDeleteResponse = object({
  status: literal(200),
})

export type TotpDeleteResponse = typeof ZodTotpDeleteResponse._type
