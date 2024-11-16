import * as z from 'zod'

export const ZodCodeConfirmBody = z.object({
  code: z.string(),
})
