import { z } from 'zod'
import { ZodFlow, ZodUnauthenticatedMeta } from '~/types/all-auth'

const ZodInvalidSessionData = z.object({
  flows: z.array(ZodFlow),
})

export const ZodInvalidSessionResponse = z.object({
  status: z.literal(410),
  data: ZodInvalidSessionData,
  meta: ZodUnauthenticatedMeta,
})

export type InvalidSessionResponse = z.infer<typeof ZodInvalidSessionResponse>
