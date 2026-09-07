import type { H3Event } from 'h3'
import { DEFAULT_LOCALE } from '~~/i18n/locales'

/**
 * The locale this request is being answered in.
 *
 * `server/middleware/1.locale.ts` resolves it once per request —
 * `?locale=` first, then the i18n cookies, the tenant default and
 * `Accept-Language` — and clamps the result to the locales the TENANT
 * serves. Read it from the context rather than re-deriving it, so a
 * route, its cache key and the header sent upstream cannot disagree.
 */
export function requestLocale(event: H3Event): string {
  // Optional chaining, as in `server/utils/auth.ts`: the middleware is
  // skipped for `/_nuxt`, `/_ipx` and `/assets`, and a cache `getKey`
  // can run before it on a warm lookup — neither is a reason to fail,
  // both mean "the store's default language".
  return (event?.context?.locale as string | undefined) || DEFAULT_LOCALE
}
