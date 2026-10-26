import { resolve } from 'node:path'
import YAML from 'yaml'
import { REPO, parseSfc } from './sourceText'

/** A component's `<i18n lang="yaml">` messages in one locale, as nested objects. */
export type InlineCopy = Record<string, any>

/**
 * The Greek (`el`) messages of the `<i18n>` block of the SFC at
 * `file` (relative to the repository root), so a spec asserts the copy the
 * component really shows without hard-coding a sentence that two component
 * trees word differently.
 */
export function inlineCopy(file: string, locale = 'el'): InlineCopy {
  const block = parseSfc(resolve(REPO, file)).customBlocks.find(b => b.type === 'i18n')
  if (!block) throw new Error(`${file} has no <i18n> block`)
  return YAML.parse(block.content)[locale]
}
