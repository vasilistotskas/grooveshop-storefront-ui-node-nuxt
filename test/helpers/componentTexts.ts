import { createI18n } from 'vue-i18n'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '~~/i18n/locales'
import type { SupportedLocale } from '~~/i18n/locales'
import { readBlockMessages } from '~~/modules/text-catalogue/extract'

/**
 * A component's own `<i18n lang="yaml">` texts, formatted by vue-i18n as the
 * component formats them (named parameters, plural forms), for a spec that
 * asserts a component's exact copy. `useNuxtApp().$i18n` holds the global
 * messages only, so it cannot give these.
 *
 * `source` is the component's file as text, read the way the text catalogue
 * reads it (`readBlockMessages`):
 *
 * ```ts
 * import presenceSource from '~/components/Builder/PresenceNotice.vue?raw'
 * const texts = componentTexts(presenceSource, 'PresenceNotice.vue')
 * expect(line).toBe(texts.t('line', { names: 'Nikos', document }, 1))
 * ```
 *
 * The texts are the block's, without a store's overrides: a spec that renders
 * a store's own wording asserts that wording.
 */
export function componentTexts(source: string, filename: string) {
  const blocks = readBlockMessages(source, filename, SUPPORTED_LOCALES)
  const textsIn = (locale: SupportedLocale) => Object.fromEntries(blocks.get(locale) ?? [])
  return createI18n({ legacy: false, locale: DEFAULT_LOCALE, flatJson: true, messages: { el: textsIn('el'), en: textsIn('en') } }).global
}
