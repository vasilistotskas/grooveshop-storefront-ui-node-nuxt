/**
 * Supported locales for the application.
 * This is used across both client and server contexts.
 */
// Platform-wide: i18n routes are generated at BUILD time, so every
// locale here exists as a route for every tenant. Whether a locale is
// REACHABLE is per-tenant — see `Tenant.available_locales` in the
// Django API and the `locale-availability` route middleware, which
// 404s a prefix the current tenant does not list.
export const SUPPORTED_LOCALES = ['el', 'en'] as const

export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: SupportedLocale = 'el'
