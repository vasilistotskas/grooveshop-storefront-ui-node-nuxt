import { z } from 'zod'
import { SUPPORTED_LOCALES } from '../../i18n/locales'

/**
 * The one query parameter a server route needs to ask Django for a
 * translation.
 *
 * Most endpoints ship a `translations` map and let the client pick with
 * `extractTranslated`. A few resolve the field SERVER-side instead —
 * promotions are the ones that bit us: Django's
 * `safe_translation_getter` runs against whatever language is active,
 * which on an API request is the site default, so `/en/offers` rendered
 * Greek offer cards over correct English rows sitting unread in the
 * database. Those routes have to name the language, and this is the
 * shape they name it in.
 *
 * Validated against `SUPPORTED_LOCALES` rather than accepted as a bare
 * string: an unvalidated value would reach a CACHE KEY, where a caller
 * could mint unlimited entries for one tenant simply by varying it.
 *
 * Optional, and absent means "the store's default" — the same thing
 * Django does with no parameter — so a route can adopt this without
 * every caller changing at once.
 */
export const zLocalizedQuery = z.object({
  languageCode: z.enum(SUPPORTED_LOCALES).optional(),
})

export type LocalizedQuery = z.infer<typeof zLocalizedQuery>
