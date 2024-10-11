import { object, string, literal } from 'zod'
import { ZodTOTPAuthenticator } from '~/types/all-auth'

export const ZodTotpPostBody = object({
  code: string().describe('An authenticator code.'),
})

export const ZodTotpPostResponse = object({
  status: literal(200),
  data: ZodTOTPAuthenticator,
})

export type TotpPostBody = typeof ZodTotpPostBody._type
export type TotpPostResponse = typeof ZodTotpPostResponse._type
