import { object, string, optional, array, literal } from 'zod'

const ZodError = object({
  code: string(),
  param: optional(string()),
  message: string(),
})

const ZodErrors = array(ZodError)

export const ZodBadResponse = object({
  status: literal(400),
  errors: ZodErrors,
})

export type BadResponse = typeof ZodBadResponse._type
