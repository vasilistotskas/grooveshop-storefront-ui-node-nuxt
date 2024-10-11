import { object, string, optional, literal } from 'zod'
import { ZodTOTPAuthenticator } from '~/types/all-auth'

export const ZodTotpGetResponse = object({
  status: literal(200),
  data: ZodTOTPAuthenticator,
})

export const ZodTotpGetResponseError = object({
  meta: object({
    secret: optional(string()),
    totp_url: optional(string()),
    totp_svg: optional(string()),
    totp_svg_data_uri: optional(string()),
  }),
  status: literal(404),
})

export type TotpGetResponse = typeof ZodTotpGetResponse._type
export type TotpGetResponseError = typeof ZodTotpGetResponseError._type
