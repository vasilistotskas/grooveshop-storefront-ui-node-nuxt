import { z } from 'zod'

const ZodSession = z.object({
  user_agent: z.string(),
  ip: z.string(),
  created_at: z.number(),
  is_current: z.boolean(),
  id: z.number(),
  last_seen_at: z.number().optional(),
})

export const ZodSessionsGetResponse = z.object({
  status: z.number(),
  data: z.array(ZodSession),
})
