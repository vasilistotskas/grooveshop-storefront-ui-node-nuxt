import * as z from 'zod'

export const ZodCodeRequestResponse = z.object({
  status: z.literal(200),
  meta: ZodAuthenticationMeta.optional(),
})
