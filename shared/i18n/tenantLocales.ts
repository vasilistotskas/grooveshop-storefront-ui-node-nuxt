import { SUPPORTED_LOCALES } from '../../i18n/locales'

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
 * May @nuxtjs/i18n's browser-language detection run for this tenant?
 *
 * It must not on a store that sells in ONE language. Detection matches
 * `navigator.languages` against the BUILD-TIME locale list, which is
 * platform-wide — it cannot see `Tenant.available_locales` — so on an
 * English-preferring browser it resolved `en` for a Greek-only store
 * and, under `redirectOn: 'root'`, redirected `/` onto `/en`, which
 * `app/middleware/locale-available.global.ts` 404s. The store's own
 * homepage answered with an error page.
 *
 * A store serving a single NON-default locale still needs detection:
 * the redirect onto its prefix is the only way `/` reaches it, and the
 * guard allows that prefix. So the answer is "no" for exactly one case
 * — one locale, and it is the one that needs no prefix.
 *
 * `defaultLocale` is the module's, read from `public.i18n` rather than
 * imported, because it is what the redirect actually compares against.
 */
export function tenantDetectsBrowserLocale(
  tenant?: { defaultLocale?: string | null, availableLocales?: readonly string[] | null } | null,
  defaultLocale?: string | null,
): boolean {
  const allowed = tenantAllowedLocales(tenant)
  return !(allowed.length === 1 && allowed[0] === defaultLocale)
}
