import { localeFromPath } from '~~/shared/i18n/localeFromPath'
import { servedLocale } from '~~/shared/i18n/tenantLocales'

/**
 * `event.context.locale`: the language of the page the visitor is on.
 *
 * Everything downstream reads it — the `X-Language` sent to Django
 * (`createHeaders`, `useBackendFetch`, the `forwarded-proto` plugin),
 * `requestLocale()`, and every Nitro cache key (`tenantCacheKey`) — so
 * it must be the language the response is rendered for, and nothing
 * else.
 *
 * - A page request: the locale of its path. Under `prefix_except_default`
 *   the URL itself carries it (`splitLocale`), and it is exactly what
 *   @nuxtjs/i18n renders.
 * - An `/api` request: `X-Language`, which the app's one fetcher sets to
 *   the page's locale (`pageLocaleHeader`, app/utils/api.ts). A browser
 *   `/api` call does not carry the page path, and an SSR sub-request is
 *   a new event that inherits the page's headers but not its context.
 *
 * Either way the candidate is clamped by `servedLocale`, the rule the
 * route guard uses too, so a missing, unknown or unserved value gets the
 * locale the unprefixed page renders.
 *
 * No cookie, `Accept-Language` or `?locale=` source: with
 * `detectBrowserLanguage: false` the URL is the truth, and a stale
 * `i18n_redirected` cookie from before that change must not decide the
 * language of a page whose URL says otherwise.
 */
export default defineEventHandler((event) => {
  if (event.path.startsWith('/_nuxt') || event.path.startsWith('/_ipx') || event.path.startsWith('/assets')) return

  const path = event.path.split('?', 1)[0] ?? '/'
  const candidate = path.startsWith('/api/')
    ? getHeader(event, 'x-language')
    : localeFromPath(path)

  event.context.locale = servedLocale(candidate, event.context.tenant as TenantConfig | undefined)
})
