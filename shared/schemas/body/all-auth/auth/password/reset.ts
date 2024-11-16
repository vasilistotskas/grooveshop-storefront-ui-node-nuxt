import * as z from 'zod'

export const ZodPasswordResetPostBody = z.object({
  key: z.string(),
  password: z.string(),
})
