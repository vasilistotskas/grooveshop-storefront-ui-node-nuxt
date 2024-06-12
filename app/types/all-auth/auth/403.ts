import { z } from 'zod'

export const ZodForbiddenResponse = z.object({
  status: z.literal(403),
})

export type ForbiddenResponse = z.infer<typeof ZodForbiddenResponse>
