import * as z from 'zod'

export const ZodAllAuthResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta.optional(),
})
