import { object, string, literal } from 'zod'
import { ZodAuthenticationMeta, ZodAuthenticated } from '~/types/all-auth'

export const ZodTwoFaReauthenticateBody = object({
  code: string().describe('An authenticator code.'),
})

export const ZodTwoFaReauthenticateResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type TwoFaReauthenticateBody = typeof ZodTwoFaReauthenticateBody._type
export type TwoFaReauthenticateResponse = typeof ZodTwoFaReauthenticateResponse._type
