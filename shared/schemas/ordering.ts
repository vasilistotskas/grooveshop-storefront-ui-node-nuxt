import * as z from 'zod'

export const ZodOrderingQuery = z.object({
  ordering: z.union([z.number(), z.string()]).nullish(),
})
