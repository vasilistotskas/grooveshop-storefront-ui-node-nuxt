import { z } from 'zod'
import { ZodSession } from '~/types/all-auth'

export const ZodSessionsGetResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodSession),
})
