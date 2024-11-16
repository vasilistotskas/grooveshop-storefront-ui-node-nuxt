import * as z from 'zod'

export const ZodConflictResponse = z.object({
  status: z.literal(409),
})
