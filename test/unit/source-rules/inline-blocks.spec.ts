import { describe, expect, it, beforeAll } from 'vitest'
import YAML from 'yaml'
import { SUPPORTED_LOCALES } from '~~/i18n/locales'
import { APP, appLabel, parseSfc, vueFiles } from '../../helpers/sourceText'

/**
 * Component-level messages live in per-SFC `<i18n lang="yaml">` blocks,
 * NOT in `i18n/locales/**`, so the JSON bundles say nothing about them.
 * `i18n.config.mts` sets `fallbackLocale: 'el'` with `fallbackWarn:
 * false`, which means a block that declares only `el` renders GREEK on
 * `/en` — silently, with no warning anywhere.
 *
 * So every block declares every supported locale, with the SAME keys as
 * the default one and no empty values. A half-translated block is worse
 * than an absent translation: the missing keys fall back per-key, so one
 * component renders in two languages at once — and an empty string
 * renders nothing at all.
 *
 * The frozen `webside` tree is NOT translatable.
 * `app/components/variants/webside/**` is a byte-for-byte copy of the
 * storefront webside.gr renders today, kept while the platform defaults
 * are redesigned. Adding a locale to one of those blocks would change
 * that store's rendered output, which is the one thing the freeze
 * exists to prevent; that store serves Greek only.
 */
const DEFAULT_BLOCK_LOCALE = 'el'
const FROZEN_TREE = 'components/variants/webside/'

/** Every leaf of a message tree as `path` → value. */
function leaves(value: unknown, prefix = ''): Array<[string, unknown]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [[prefix, value]]
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nested]) => leaves(nested, prefix ? `${prefix}.${key}` : key),
  )
}

interface Block { file: string, messages: Record<string, unknown> }

let blocks: Block[]

beforeAll(() => {
  blocks = vueFiles(APP)
    .filter(file => !appLabel(file).startsWith(FROZEN_TREE))
    .flatMap(file => parseSfc(file).customBlocks
      .filter(block => block.type === 'i18n')
      .map(block => ({ file: appLabel(file), messages: (YAML.parse(block.content) ?? {}) as Record<string, unknown> })))
})

describe('inline <i18n> blocks', () => {
  it('finds the blocks at all', () => {
    // A guard on the guard: a refactor that renames the block or moves
    // the messages elsewhere must not turn this suite into a no-op.
    expect(blocks.length).toBeGreaterThan(150)
  })

  it('declare every supported locale', () => {
    const missing = blocks.flatMap(({ file, messages }) =>
      SUPPORTED_LOCALES.filter(locale => !messages[locale]).map(locale => `${file} [${locale}]`),
    )

    expect(missing, 'a missing locale renders the Greek fallback').toEqual([])
  })

  it('declare the same keys in every locale as in the default one', () => {
    const mismatched: string[] = []
    for (const { file, messages } of blocks) {
      const expected = leaves(messages[DEFAULT_BLOCK_LOCALE]).map(([path]) => path).sort()
      for (const locale of SUPPORTED_LOCALES) {
        if (locale === DEFAULT_BLOCK_LOCALE || !messages[locale]) continue
        const actual = leaves(messages[locale]).map(([path]) => path).sort()
        const onlyDefault = expected.filter(k => !actual.includes(k))
        const onlyLocale = actual.filter(k => !expected.includes(k))
        if (onlyDefault.length || onlyLocale.length) {
          mismatched.push(`${file} [${locale}] missing: ${onlyDefault.join(', ') || '—'} / extra: ${onlyLocale.join(', ') || '—'}`)
        }
      }
    }

    expect(mismatched).toEqual([])
  })

  it('leave no message empty', () => {
    const empty = blocks.flatMap(({ file, messages }) =>
      SUPPORTED_LOCALES.flatMap(locale =>
        leaves(messages[locale])
          .filter(([, value]) => value === null || value === '')
          .map(([path]) => `${file} [${locale}] ${path}`),
      ),
    )

    expect(empty, 'an empty message renders nothing').toEqual([])
  })
})
