import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, beforeAll } from 'vitest'
import { DEFAULT_LOCALE, LOCALE_FILES, LOCALE_FILES_DIR, SUPPORTED_LOCALES } from '~~/i18n/locales'
import type { SupportedLocale } from '~~/i18n/locales'
import { flattenMessages } from '~~/modules/text-catalogue/extract'
import { shapeMismatch } from '../../helpers/messageParity'
import { REPO } from '../../helpers/sourceText'

/**
 * The global locale files (`i18n/locales/**`), read from `LOCALE_FILES`,
 * the list `nuxt.config.ts` hands @nuxtjs/i18n. `inline-blocks.spec.ts`
 * holds the components' `<i18n>` blocks to the same rules.
 *
 * `i18n.config.mts` sets `fallbackLocale: 'el'` with `missingWarn: false`,
 * so a key only the Greek files have renders GREEK on `/en`, silently, and
 * a key only the English files have renders English on `/el`. An empty
 * message renders nothing, and a translation that drops a placeholder or a
 * plural form drops the amount or the count it was meant to show.
 */
interface Message { file: string, text: string }

/** A locale's messages by key, merged in load order: a later file wins, as in @nuxtjs/i18n. */
function bundle(locale: SupportedLocale): Map<string, Message> {
  const messages = new Map<string, Message>()
  for (const file of LOCALE_FILES[locale]) {
    const tree: unknown = JSON.parse(readFileSync(join(REPO, LOCALE_FILES_DIR, file), 'utf8'))
    for (const [key, text] of flattenMessages(tree)) messages.set(key, { file, text })
  }
  return messages
}

let bundles: Map<SupportedLocale, Map<string, Message>>

beforeAll(() => {
  bundles = new Map(SUPPORTED_LOCALES.map(locale => [locale, bundle(locale)]))
})

const others = SUPPORTED_LOCALES.filter(locale => locale !== DEFAULT_LOCALE)

describe('the global locale files', () => {
  it('are read at all', () => {
    // A guard on the guard: a renamed directory or an emptied list must
    // not turn this suite into a no-op.
    for (const locale of SUPPORTED_LOCALES) expect(bundles.get(locale)!.size).toBeGreaterThan(500)
  })

  it.each(others)('declare the same keys in %s as in the default locale', (locale) => {
    const expected = bundles.get(DEFAULT_LOCALE)!
    const actual = bundles.get(locale)!
    const missing = [...expected].filter(([key]) => !actual.has(key)).map(([key, { file }]) => `${file}: ${key}`)
    const extra = [...actual].filter(([key]) => !expected.has(key)).map(([key, { file }]) => `${file}: ${key}`)

    expect({ missing, extra }, 'a key one locale lacks renders the other locale\'s text').toEqual({ missing: [], extra: [] })
  })

  it('leave no message empty', () => {
    const empty = [...bundles].flatMap(([locale, messages]) =>
      [...messages].filter(([, { text }]) => !text.trim()).map(([key, { file }]) => `${file} [${locale}]: ${key}`),
    )

    expect(empty, 'an empty message renders nothing').toEqual([])
  })

  it.each(others)('give every message in %s the placeholders and plural forms of the default locale', (locale) => {
    const expected = bundles.get(DEFAULT_LOCALE)!
    const differing = [...bundles.get(locale)!].flatMap(([key, { file, text }]) => {
      const original = expected.get(key)
      if (!original) return []
      const mismatch = shapeMismatch(original.text, text)
      return mismatch ? [`${file}: ${key}: ${mismatch}`] : []
    })

    expect(differing).toEqual([])
  })
})
