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
