import { z } from 'zod'
import { ZodSession } from '~/types/all-auth'

export const ZodSessionsDeleteBody = z.object({
  sessions: z.array(z.number()),
})

export const ZodSessionsDeleteResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodSession),
})

export type SessionsDeleteBody = z.infer<typeof ZodSessionsDeleteBody>
export type SessionsDeleteResponse = z.infer<typeof ZodSessionsDeleteResponse>
