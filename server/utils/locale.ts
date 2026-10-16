import type { RequestEvent } from 'nuxt/server'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import type { SupportedLocale } from '~~/i18n/locales'
import { localeFromPath } from '~~/shared/i18n/localeFromPath'
import { servedLocale } from '~~/shared/i18n/tenantLocales'

/**
 * The language of the page a request is for: the locale of a page's
 * path, or the `X-Language` the app's fetcher states on an `/api` call
 * (a browser `/api` call does not carry the page path), clamped by
 * `servedLocale` so a missing, unknown or unserved value gets the locale
 * the unprefixed page renders.
 *
 * `server/middleware/1.locale.ts` stores it once per request; the site
 * config, which can be built before that middleware runs
 * (`server/plugins/tenant-site-config.ts`), derives the same value.
 */
export function pageLocale(
  path: string,
  languageHeader: string | undefined,
  tenant: Parameters<typeof servedLocale>[1],
): SupportedLocale {
  const candidate = path.startsWith('/api/') ? languageHeader : localeFromPath(path)
  return servedLocale(candidate, tenant)
}

/**
 * The locale this request is being answered in.
 *
 * `server/middleware/1.locale.ts` resolves it once per request
 * (`pageLocale`). Read it from the context rather than re-deriving it,
 * so a route, its cache key and the header sent upstream cannot
 * disagree.
 */
export function requestLocale(event: Pick<RequestEvent, 'context'>): SupportedLocale {
  // The middleware skips `/_nuxt`, `/_ipx` and `/assets`, which is no
  // reason to fail: no locale means "the store's default language".
  // Only `1.locale` writes it, through `servedLocale`, which yields a
  // supported locale. Read from the context, so it serves every event
  // the server hands out, the cache keys' h3 event included.
  return event.context.locale || DEFAULT_LOCALE
}
