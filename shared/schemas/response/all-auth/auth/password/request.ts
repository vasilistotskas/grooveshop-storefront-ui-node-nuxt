import * as z from 'zod'

export const ZodPasswordRequestResponse = z.object({
  status: z.literal(200),
})
