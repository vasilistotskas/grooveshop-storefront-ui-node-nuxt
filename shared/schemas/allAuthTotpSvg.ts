import * as z from 'zod'

/**
 * `GET account/authenticators/totp/svg`, for a shopper with no authenticator:
 * the answer of Django's own TOTP setup view (`src/core/views.py`). Like
 * allauth's TOTP status it is a 404 that carries what to enrol with, plus
 * the QR code as an SVG. Allauth's document describes the other answer, the
 * 200 for a shopper who has one (`zGetAllauthAppV1AccountAuthenticatorsTotpSvgResponse`),
 * and only that: the 404's body is not in it, so it is written here.
 */
export const ZodTotpSvgSetup = z.object({
  meta: z.object({
    secret: z.string().optional(),
    totp_url: z.string().optional(),
    totp_svg: z.string().optional(),
    totp_svg_data_uri: z.string().optional(),
  }),
  status: z.literal(404),
})
