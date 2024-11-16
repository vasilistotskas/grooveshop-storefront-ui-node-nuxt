import * as z from 'zod'

export const ZodTwoFaReauthenticateResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})
