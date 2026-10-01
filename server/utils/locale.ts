import type { H3Event } from 'h3'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import type { SupportedLocale } from '~~/i18n/locales'

/**
 * The locale this request is being answered in.
 *
 * `server/middleware/1.locale.ts` resolves it once per request — the
 * page path's locale, or the `X-Language` the app's fetcher states on an
 * `/api` call — clamped by `servedLocale`. Read it from the context
 * rather than re-deriving it, so a route, its cache key and the header
 * sent upstream cannot disagree.
 */
export function requestLocale(event: H3Event): SupportedLocale {
  // Optional chaining, as in `server/utils/auth.ts`: the middleware is
  // skipped for `/_nuxt`, `/_ipx` and `/assets`, and a cache `getKey`
  // can run before it on a warm lookup — neither is a reason to fail,
  // both mean "the store's default language".
  // Only `1.locale` writes it, through `servedLocale`, which yields a
  // supported locale.
  return event?.context?.locale || DEFAULT_LOCALE
}
