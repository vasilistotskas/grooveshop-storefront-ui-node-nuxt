import * as z from 'zod'

export const ZodSessionsDeleteBody = z.object({
  sessions: z.array(z.number()),
})
