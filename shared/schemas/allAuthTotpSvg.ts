import * as z from 'zod'

/**
 * `GET account/authenticators/totp/svg`: the answer of Django's own TOTP
 * setup view (`core/views.py`), not an allauth endpoint, so allauth's
 * document does not describe it and nothing is generated for it. Like
 * allauth's TOTP status it is a 404 that carries what to enrol with, plus
 * the QR code as an SVG.
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
