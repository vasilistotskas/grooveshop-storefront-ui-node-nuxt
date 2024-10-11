import { literal, object, string } from 'zod'

export const ZodNotFoundResponse = object({
  status: literal(404),
  meta: object({
    secret: string(),
  }),
})

export type NotFoundResponse = typeof ZodNotFoundResponse._type
