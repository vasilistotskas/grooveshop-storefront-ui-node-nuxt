import type { Locale } from '@nuxt/ui'
import { el, en } from '@nuxt/ui/locale'

/**
 * Nuxt UI's own locale bundles, for the locales listed in
 * `SUPPORTED_LOCALES` (`i18n/locales.ts`).
 *
 * These are `@nuxt/ui` `Locale` objects (`{ name, code, dir, messages }`)
 * — a different shape from the `@nuxtjs/i18n` locale objects returned by
 * `useI18n().locales` (`{ code, name, files, language, flag }`): each
 * carries the language's own name, which the language switchers show.
 * `UApp` needs none of this: it follows the i18n locale itself and
 * bundles only the Nuxt UI locales `i18n.locales` lists.
 *
 * Imported by NAME, never as a namespace: `import * as locales` pulled
 * all 63 of @nuxt/ui's locale files into the entry chunk of every page
 * (129KB of the entry's 324KB minified, 2026-08-29 entry-chunk
 * sourcemap audit).
 *
 * **Activating a new platform locale means adding its import here — and
 * nowhere else** — for the switchers.
 */
const UI_LOCALES = { el, en } as const

/** Narrow an arbitrary locale code to one Nuxt UI actually ships. */
export function toUiLocales(codes: readonly string[]): Locale<unknown>[] {
  return codes
    .map(code => (UI_LOCALES as Record<string, Locale<unknown>>)[code])
    .filter((entry): entry is Locale<unknown> => entry !== undefined)
}
