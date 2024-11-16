import * as z from 'zod'

export const ZodNotFoundResponse = z.object({
  status: z.literal(404),
  meta: z.object({
    secret: z.string(),
  }),
})
