import type { RequestEvent } from 'nuxt/server'
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
export function requestLocale(event: Pick<RequestEvent, 'context'>): SupportedLocale {
  // The middleware skips `/_nuxt`, `/_ipx` and `/assets`, which is no
  // reason to fail: no locale means "the store's default language".
  // Only `1.locale` writes it, through `servedLocale`, which yields a
  // supported locale. Read from the context, so it serves every event
  // the server hands out, the cache keys' h3 event included.
  return event.context.locale || DEFAULT_LOCALE
}
