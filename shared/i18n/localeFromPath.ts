import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/locales'

// `/en`, `/en/`, `/en/products`, `/en-us/products` — the home page of a
// prefixed locale carries no further segment, which a `(?=\/)` lookahead
// alone would miss.
const LOCALE_PREFIX_RE = /^\/([a-z]{2})(?:-[a-z]{2})?(?=\/|$)/i

/**
 * The locale a path is for, and the route beneath the prefix.
 *
 * Under `prefix_except_default` the URL itself carries the locale, so
 * this needs no Vue or Nuxt context — which is the point. `useI18n()`
 * is only valid at the top of a component `setup()`, and reaching for
 * it in a global route middleware is what returned 500 on every page
 * of every tenant on storefront v3.168.0 through v3.170.1:
 * "Must be called at the top of a `setup` function", thrown before any
 * component rendered. `useNuxtApp().$i18n` is not the way out either —
 * @nuxtjs/i18n injects it from its own setup plugin, so it can be
 * `undefined` (the module's `scrollBehavior` example guards with
 * `if (nuxtApp.$i18n)`).
 *
 * The prefix is checked against `SUPPORTED_LOCALES` rather than trusted
 * as "any two letters": a genuine top-level route that happens to be
 * two characters long (`/eu/policy`) would otherwise read as a locale.
 * No prefix means the default locale, which is what
 * `prefix_except_default` emits.
 */
export function splitLocale(path: string): { locale: string, route: string } {
  const withoutTrailingSlash = path.replace(/\/$/, '') || '/'
  const candidate = withoutTrailingSlash
    .match(LOCALE_PREFIX_RE)?.[1]
    ?.toLowerCase()
  if (
    !candidate
    || !(SUPPORTED_LOCALES as readonly string[]).includes(candidate)
  ) {
    return { locale: DEFAULT_LOCALE, route: withoutTrailingSlash }
  }
  return {
    locale: candidate,
    route: withoutTrailingSlash.replace(LOCALE_PREFIX_RE, '') || '/',
  }
}

/** The locale a path is for. See {@link splitLocale}. */
export function localeFromPath(path: string): string {
  return splitLocale(path).locale
}
