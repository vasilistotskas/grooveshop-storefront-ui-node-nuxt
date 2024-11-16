import * as z from 'zod'

export const ZodTotpDeleteResponse = z.object({
  status: z.literal(200),
})

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

export const ZodTotpPostResponse = z.object({
  status: z.literal(200),
  data: ZodTOTPAuthenticator,
})
