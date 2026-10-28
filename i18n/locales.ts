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

/**
 * Where the global locale files live, relative to the project root:
 * `i18n.restructureDir` (`nuxt.config.ts`) plus @nuxtjs/i18n's default
 * `langDir`.
 */
export const LOCALE_FILES_DIR = 'i18n/locales'

/**
 * The global locale files of each locale, relative to `LOCALE_FILES_DIR`,
 * in the order @nuxtjs/i18n merges them (`i18n.locales[].files`). The
 * text catalogue (`modules/text-catalogue.ts`) reads the same list, so the
 * texts it offers for editing are the ones the app loads.
 */
export const LOCALE_FILES: Record<SupportedLocale, readonly string[]> = {
  el: [
    'el-GR.json',
    'auth/el-GR.json',
    'breadcrumb/el-GR.json',
    'checkout/el-GR.json',
    'cookies/el-GR.json',
    'validation/el-GR.json',
  ],
  en: [
    'en-US.json',
    'auth/en-US.json',
    'breadcrumb/en-US.json',
    'checkout/en-US.json',
    'cookies/en-US.json',
    'validation/en-US.json',
  ],
}
