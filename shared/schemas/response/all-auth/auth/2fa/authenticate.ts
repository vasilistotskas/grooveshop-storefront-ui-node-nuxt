import * as z from 'zod'

export const ZodTwoFaAuthenticateResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})
