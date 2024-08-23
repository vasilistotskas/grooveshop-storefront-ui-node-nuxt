import { z } from 'zod'
import { ZodTOTPAuthenticator } from '~/types/all-auth'

export const ZodTotpGetResponse = z.object({
  status: z.literal(200),
  data: ZodTOTPAuthenticator,
})

export const ZodTotpGetResponseError = z.object({
  meta: z.object({
    secret: z.string().optional(),
    totp_url: z.string().optional(),
    totp_svg: z.string().optional(),
    totp_svg_data_uri: z.string().optional(),
  }),
  status: z.literal(404),
})

export type TotpGetResponse = z.infer<typeof ZodTotpGetResponse>
export type TotpGetResponseError = z.infer<typeof ZodTotpGetResponseError>
