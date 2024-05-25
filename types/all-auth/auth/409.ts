import { z } from 'zod'

export const ZodConflictResponse = z.object({
  status: z.literal(409),
})

export type ConflictResponse = z.infer<typeof ZodConflictResponse>
