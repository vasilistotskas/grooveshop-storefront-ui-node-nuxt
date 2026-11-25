import type { Locale } from '@nuxt/ui'
import { LOCALE_PROPERTIES, SUPPORTED_LOCALES, type SupportedLocale } from '~~/i18n/locales'

/**
 * The locales listed in `SUPPORTED_LOCALES` (`i18n/locales.ts`) among
 * `codes`, as Nuxt UI `Locale` objects, the shape `ULocaleSelect` takes.
 *
 * These are a different shape from the `@nuxtjs/i18n` locale objects
 * returned by `useI18n().locales` (`{ code, name, files, language, flag }`).
 * Each carries the language's own name (`LOCALE_PROPERTIES`), which the
 * language switchers show, and no messages: nothing here reads them.
 * `UApp` needs none of this: it follows the i18n locale itself and loads
 * the Nuxt UI messages of the locale shown, lazily. Importing Nuxt UI's
 * locale bundles here kept that load from splitting
 * (INEFFECTIVE_DYNAMIC_IMPORT in the build).
 */
export function toUiLocales(codes: readonly string[]): Locale<unknown>[] {
  return codes
    .filter((code): code is SupportedLocale => (SUPPORTED_LOCALES as readonly string[]).includes(code))
    .map((code) => {
      const { name, dir } = LOCALE_PROPERTIES[code]
      return { code, name, dir, messages: {} }
    })
}
