import { object, string, literal } from 'zod'
import { ZodAuthenticated, ZodAuthenticationMeta } from '~/types/all-auth'

export const ZodTwoFaAuthenticateBody = object({
  code: string().describe('An authenticator code.'),
})

export const ZodTwoFaAuthenticateResponse = object({
  status: literal(200),
  data: ZodAuthenticated,
  meta: ZodAuthenticationMeta,
})

export type TwoFaAuthenticateBody = typeof ZodTwoFaAuthenticateBody._type
export type TwoFaAuthenticateResponse = typeof ZodTwoFaAuthenticateResponse._type
