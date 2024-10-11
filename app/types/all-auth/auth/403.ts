import { literal, object } from 'zod'

export const ZodForbiddenResponse = object({
  status: literal(403),
})

export type ForbiddenResponse = typeof ZodForbiddenResponse._type
