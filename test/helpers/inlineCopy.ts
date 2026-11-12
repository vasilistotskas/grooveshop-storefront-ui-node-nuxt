import { resolve } from 'node:path'
import { createI18n } from 'vue-i18n'
import YAML from 'yaml'
import { DEFAULT_LOCALE } from '../../i18n/locales.ts'
import type { SupportedLocale } from '../../i18n/locales.ts'
import { REPO, parseSfc } from './sourceText'

/** A component's `<i18n lang="yaml">` messages in one locale, as nested objects. */
export type InlineCopy = Record<string, any>

/**
 * The messages (Greek, `el`, by default) of the `<i18n>` block of the SFC at
 * `file` (relative to the repository root), so a spec asserts the copy the
 * component really shows without hard-coding a sentence that two component
 * trees word differently.
 */
export function inlineCopy(file: string, locale: SupportedLocale = DEFAULT_LOCALE): InlineCopy {
  const block = parseSfc(resolve(REPO, file)).customBlocks.find(b => b.type === 'i18n')
  if (!block) throw new Error(`${file} has no <i18n> block`)
  return YAML.parse(block.content)[locale]
}

/** A block's messages in one locale: a text, or a group of further messages. */
export interface InlineMessages {
  [key: string]: string | InlineMessages
}

/** Formats one message of a component's `<i18n>` block, as the component's `t` does. */
export type InlineTranslate = (key: string, params?: Record<string, unknown>, plural?: number) => string

/**
 * A block's messages formatted by vue-i18n, the library the component's `t`
 * is, for a message that interpolates (`{count}`) or chooses a plural
 * (`a | b`): the raw text `inlineCopy` gives is not what the component
 * draws. A plain message is `inlineCopy(file).key`, already the exact text.
 * The global `$i18n` holds only the app's shared messages, never a block's.
 * A block with no messages in a locale (webside's Greek-only ones) has none
 * there.
 */
export function inlineT(file: string, locale: SupportedLocale = DEFAULT_LOCALE): InlineTranslate {
  // Every locale the app has, as the type requires: a new one fails here.
  const messages: Record<SupportedLocale, InlineMessages> = { el: inlineCopy(file, 'el') ?? {}, en: inlineCopy(file, 'en') ?? {} }
  const { t } = createI18n<[InlineMessages], SupportedLocale, false>({ legacy: false, locale, messages }).global
  return (key, params = {}, plural) => (plural === undefined ? t(key, params) : t(key, params, plural))
}
