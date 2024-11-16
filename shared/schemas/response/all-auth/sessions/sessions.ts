import * as z from 'zod'
import { ZodSession } from '../../../model/all-auth'

export const ZodSessionsGetResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodSession),
})

export const ZodSessionsDeleteResponse = z.object({
  status: z.literal(200),
  data: z.array(ZodSession),
})
