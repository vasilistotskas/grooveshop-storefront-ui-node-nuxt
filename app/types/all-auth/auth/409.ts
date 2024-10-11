import { object, literal } from 'zod'

export const ZodConflictResponse = object({
  status: literal(409),
})

export type ConflictResponse = typeof ZodConflictResponse._type
