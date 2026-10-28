import * as z from 'zod'
import { SUPPORTED_LOCALES } from '../../../i18n/locales.ts'

/**
 * The longest text the validator compiles. The route is public, so the
 * compile has a bound; the longest default of the catalogue is under 400
 * characters. (Django caps what a store may save, tighter still.)
 */
export const TEXT_VALUE_MAX_LENGTH = 2000

/** `POST /api/texts/validate`: one store-written text to check against the catalogue. */
export const ZodTextValidateBody = z.object({
  namespace: z.string().min(1),
  key: z.string().min(1),
  locale: z.enum(SUPPORTED_LOCALES),
  value: z.string().max(TEXT_VALUE_MAX_LENGTH),
})

export type TextValidateBody = z.infer<typeof ZodTextValidateBody>
