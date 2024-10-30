import * as z from 'zod'
import { ZodAuthenticated, ZodAuthenticationMeta } from '~/types/all-auth'

export const ZodTwoFaAuthenticateBody = z.object({
  code: z.string().describe('An authenticator code.'),
})

export const ZodTwoFaAuthenticateResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type TwoFaAuthenticateBody = z.infer<typeof ZodTwoFaAuthenticateBody>
export type TwoFaAuthenticateResponse = z.infer<typeof ZodTwoFaAuthenticateResponse>
