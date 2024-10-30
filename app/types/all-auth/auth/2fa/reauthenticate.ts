import * as z from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodTwoFaReauthenticateBody = z.object({
  code: z.string().describe('An authenticator code.'),
})

export const ZodTwoFaReauthenticateResponse = z.object({
  status: z.literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type TwoFaReauthenticateBody = z.infer<typeof ZodTwoFaReauthenticateBody>
export type TwoFaReauthenticateResponse = z.infer<typeof ZodTwoFaReauthenticateResponse>
