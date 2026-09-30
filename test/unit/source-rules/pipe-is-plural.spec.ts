import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, beforeAll } from 'vitest'
import YAML from 'yaml'
import { APP, REPO, appLabel, parseSfc, relativeLabel, vueFiles } from '../../helpers/sourceText'

/**
 * A bare `|` in a vue-i18n message is the PLURAL separator, never text:
 * `'Requested: {requested} | Available: {available}'` is two plural
 * forms, and a `t()` without a count renders only the first —
 * "Requested: 5". A literal pipe is the literal interpolation `{'|'}`.
 *
 * The forms of a real plural message say one thing in different numbers,
 * so they share their placeholders ("{minutes} minute | {minutes}
 * minutes"); a form may drop the count ("no items | {count} items").
 * Forms naming DIFFERENT placeholders are two sentences cut apart. The
 * frozen `webside` tree is included: it must render correctly too.
 */
interface Message { where: string, value: string }

const LITERAL = /\{\s*'[^']*'\s*\}/g
const PLACEHOLDER = /\{\s*([\w$]+)\s*\}/g

/** Every leaf string of a message tree. */
function strings(value: unknown, where: string, out: Message[]): Message[] {
  if (typeof value === 'string') out.push({ where, value })
  else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) strings(nested, `${where}.${key}`, out)
  }
  return out
}

function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? jsonFiles(join(dir, entry.name))
      : entry.name.endsWith('.json') ? [join(dir, entry.name)] : [],
  )
}

const placeholders = (form: string) => [...form.matchAll(PLACEHOLDER)].map(match => match[1]!).sort().join(',')

let messages: Message[]

beforeAll(() => {
  messages = [
    ...jsonFiles(join(REPO, 'i18n/locales')).flatMap(file =>
      strings(JSON.parse(readFileSync(file, 'utf8')), relativeLabel(REPO, file), [])),
    ...vueFiles(APP).flatMap(file => parseSfc(file).customBlocks
      .filter(block => block.type === 'i18n')
      .flatMap(block => strings(YAML.parse(block.content) ?? {}, appLabel(file), []))),
  ]
})

describe('a `|` in a message', () => {
  it('finds plural messages at all', () => {
    // A guard on the guard: the scan must keep seeing the plurals.
    expect(messages.filter(({ value }) => value.replace(LITERAL, '').includes('|')).length).toBeGreaterThan(30)
  })

  it('separates plural forms only: a literal pipe is {\'|\'}', () => {
    const cut = messages.filter(({ value }) => {
      const forms = value.replace(LITERAL, '').split('|')
      if (forms.length < 2) return false
      const named = new Set(forms.map(placeholders).filter(Boolean))
      return named.size > 1
    })

    expect(cut.map(({ where, value }) => `${where} = ${value}`)).toEqual([])
  })
})
