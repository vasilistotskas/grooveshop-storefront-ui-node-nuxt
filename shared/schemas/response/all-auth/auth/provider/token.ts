import * as z from 'zod'

export const ZodProviderTokenResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})
