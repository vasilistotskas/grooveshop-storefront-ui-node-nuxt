import * as z from 'zod'

export const ZodBadResponse = z.object({
  status: z.literal(400),
  errors: z.array(z.object({
    code: z.string(),
    param: z.string().optional(),
    message: z.string(),
  })),
})
