import { analyzeMessage } from '../../shared/utils/messageShape.ts'

/**
 * Why `translation` cannot stand in for `original`, its default-locale
 * message, or `undefined` when it can. Both are compiled the way vue-i18n
 * compiles them at run time (`analyzeMessage`).
 *
 * - The parameters (`{amount}`, `{0}`, `@:linked.key`) must be the same: a
 *   translation that drops one drops the amount it was meant to show, and
 *   one the call does not pass renders blank.
 * - Plural forms must be as many when both messages have forms. A message
 *   with ONE form is a word the language does not inflect ("{minutes} min
 *   read"), which vue-i18n renders for every count; between two plurals,
 *   the count picks a different form when their numbers differ (with three
 *   forms the first is zero).
 */
export function shapeMismatch(original: string, translation: string): string | undefined {
  const want = analyzeMessage(original).shape
  const got = analyzeMessage(translation).shape
  const params = got.params.join(', ') !== want.params.join(', ')
  const forms = want.pluralCases > 1 && got.pluralCases > 1 && want.pluralCases !== got.pluralCases
  if (!params && !forms) return undefined
  return `params [${got.params.join(', ')}] in ${got.pluralCases} form(s), the default has [${want.params.join(', ')}] in ${want.pluralCases}`
}
