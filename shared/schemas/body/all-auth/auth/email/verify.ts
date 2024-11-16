import * as z from 'zod'

export const ZodEmailVerifyPostBody = z.object({
  key: z.string(),
})
