import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/locales'

/**
 * The locales a given tenant may actually be served in.
 *
 * `SUPPORTED_LOCALES` is platform-wide and fixed at build time — every
 * locale in it has routes on every tenant. `Tenant.available_locales`
 * is the per-tenant allow-list on top of that. Empty (the default, and
 * what every tenant predating the field reports) means single-language
 * on the tenant's own default locale.
 *
 * Falls back to the platform list only when there is no tenant config
 * at all, so a resolution failure never locks a store out of its own
 * language.
 *
 * Shared deliberately: the server locale middleware, the route guard
 * and the language switcher must agree, or a visitor can be handed a
 * locale one layer allows and another rejects.
 */
export function tenantAllowedLocales(
  tenant?: { defaultLocale?: string | null, availableLocales?: readonly string[] | null } | null,
): string[] {
  if (!tenant) return [...SUPPORTED_LOCALES]

  const listed = (tenant.availableLocales ?? []).filter(code =>
    (SUPPORTED_LOCALES as readonly string[]).includes(code),
  )
  if (listed.length) return [...listed]

  const fallback = tenant.defaultLocale
  if (fallback && (SUPPORTED_LOCALES as readonly string[]).includes(fallback)) {
    return [fallback]
  }
  return [...SUPPORTED_LOCALES]
}

/**
 * The locale a page for `candidate` is actually rendered in on this
 * tenant — the ONE rule the server locale middleware and the route
 * guard (`app/middleware/locale-available.global.ts`) share.
 *
 * `candidate` is the page's locale: its path prefix for a page request,
 * or the `X-Language` the app's fetcher states for an `/api` request. A
 * locale the tenant serves is rendered as itself. Anything else — a
 * prefix the tenant does not list (the guard 404s that page), a missing
 * or unknown value — resolves to `DEFAULT_LOCALE`, because the
 * unprefixed path is what renders then.
 *
 * `DEFAULT_LOCALE` is always served, listed or not. It is the BUILD-time
 * `i18n.defaultLocale` that `prefix_except_default` gives the unprefixed
 * routes, so `/` renders in it on every tenant: a store whose
 * `default_locale` is `en` still gets `el` on `/`, and this follows
 * what renders rather than the tenant setting. Serving a per-store
 * default on the unprefixed routes is a routing change, deliberately
 * out of scope here.
 */
export function servedLocale(
  candidate: string | null | undefined,
  tenant?: Parameters<typeof tenantAllowedLocales>[0],
): string {
  if (!candidate || candidate === DEFAULT_LOCALE) return DEFAULT_LOCALE
  return tenantAllowedLocales(tenant).includes(candidate)
    ? candidate
    : DEFAULT_LOCALE
}
