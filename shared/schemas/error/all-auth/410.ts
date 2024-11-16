import * as z from 'zod'

export const ZodInvalidSessionResponse = z.object({
  status: z.literal(410),
  data: z.object({
    flows: z.array(ZodFlow),
  }),
  meta: ZodUnauthenticatedMeta,
})
