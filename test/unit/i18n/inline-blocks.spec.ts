import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import YAML from 'yaml'
import { SUPPORTED_LOCALES } from '../../../i18n/locales'
import UNTRANSLATED from './untranslated-blocks.json'

/**
 * Component-level messages live in per-SFC `<i18n lang="yaml">` blocks,
 * NOT in `i18n/locales/**`, so the JSON bundles say nothing about them.
 * `i18n.config.mts` sets `fallbackLocale: 'el'` with `fallbackWarn:
 * false`, which means a block that declares only `el` renders GREEK on
 * `/en` — silently, with no warning anywhere.
 *
 * Two rules, and the second is the one that keeps this honest:
 *
 *  1. A block that declares a locale must declare the SAME KEYS as the
 *     default one. A half-translated block is worse than an absent
 *     translation: the missing keys fall back per-key, so one component
 *     renders in two languages at once.
 *
 *  2. `untranslated-blocks.json` records every block that is still
 *     default-locale only. It is a debt list, not a permission slip:
 *     nothing may be ADDED to it (a new Greek-only block fails), and a
 *     file translated but left in the list fails too, so the list can
 *     only shrink.
 */

const ROOT = path.resolve(import.meta.dirname, '../../..')
const DEFAULT_BLOCK_LOCALE = 'el'

function vueFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) vueFiles(full, found)
    else if (entry.name.endsWith('.vue')) found.push(full)
  }
  return found
}

function keyPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix]
  }
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nested]) => keyPaths(nested, prefix ? `${prefix}.${key}` : key),
  )
}

interface Block {
  file: string
  messages: Record<string, unknown>
}

// `\r?\n`: the repo is checked out with CRLF on Windows, and anchoring
// the block on a bare `\n` matched nothing there — an audit written that
// way reported 7 untranslated files out of the real 140.
const BLOCK_RE = /<i18n lang="yaml">\r?\n([\s\S]*?)<\/i18n>/

const BLOCKS: Block[] = vueFiles(path.join(ROOT, 'app'))
  .map((file) => {
    const source = readFileSync(file, 'utf8')
    const match = source.match(BLOCK_RE)
    if (!match) return null
    return {
      file: path.relative(ROOT, file).split(path.sep).join('/'),
      messages: YAML.parse(match[1]) as Record<string, unknown>,
    }
  })
  .filter((block): block is Block => block !== null)

describe('inline <i18n> blocks', () => {
  it('finds the blocks at all', () => {
    // A guard on the guard: a refactor that renames the block or moves
    // the messages elsewhere must not turn this suite into a no-op.
    expect(BLOCKS.length).toBeGreaterThan(150)
  })

  it('every block declares the default locale', () => {
    const missing = BLOCKS.filter(
      block => !block.messages?.[DEFAULT_BLOCK_LOCALE],
    ).map(block => block.file)

    expect(missing).toEqual([])
  })

  it('every declared locale has the same keys as the default one', () => {
    const mismatched: string[] = []
    for (const { file, messages } of BLOCKS) {
      const expected = keyPaths(messages[DEFAULT_BLOCK_LOCALE]).sort()
      for (const locale of SUPPORTED_LOCALES) {
        if (locale === DEFAULT_BLOCK_LOCALE || !messages[locale]) continue
        const actual = keyPaths(messages[locale]).sort()
        if (actual.join('|') !== expected.join('|')) {
          const onlyDefault = expected.filter(k => !actual.includes(k))
          const onlyLocale = actual.filter(k => !expected.includes(k))
          mismatched.push(
            `${file} [${locale}] missing: ${onlyDefault.join(', ') || '—'}`
            + ` / extra: ${onlyLocale.join(', ') || '—'}`,
          )
        }
      }
    }

    expect(mismatched).toEqual([])
  })

  it('no new block ships without the other locales', () => {
    const untranslated = BLOCKS.filter(({ messages }) =>
      SUPPORTED_LOCALES.some(
        locale => locale !== DEFAULT_BLOCK_LOCALE && !messages[locale],
      ),
    ).map(block => block.file)

    const added = untranslated.filter(file => !UNTRANSLATED.includes(file))
    expect(added, 'add the other locales instead of the debt list').toEqual([])
  })

  it('the debt list carries nothing already translated', () => {
    const untranslated = new Set(
      BLOCKS.filter(({ messages }) =>
        SUPPORTED_LOCALES.some(
          locale => locale !== DEFAULT_BLOCK_LOCALE && !messages[locale],
        ),
      ).map(block => block.file),
    )

    const stale = UNTRANSLATED.filter(file => !untranslated.has(file))
    expect(stale, 'drop these from untranslated-blocks.json').toEqual([])
  })
})
