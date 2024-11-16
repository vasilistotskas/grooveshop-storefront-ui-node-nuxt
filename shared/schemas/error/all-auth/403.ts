import * as z from 'zod'

export const ZodForbiddenResponse = z.object({
  status: z.literal(403),
})
