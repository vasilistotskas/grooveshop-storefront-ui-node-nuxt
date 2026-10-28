import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { parse } from 'vue/compiler-sfc'
import { parse as parseYaml } from 'yaml'

import { GLOBAL_TEXT_NAMESPACE } from '../../shared/constants/textCatalogue.ts'
import { isLockedText } from '../../shared/constants/lockedTexts.ts'
import type { TextCatalogue, TextCatalogueEntry, TextCatalogueView } from '../../shared/types/textCatalogue.ts'
import { analyzeMessage } from '../../shared/utils/messageShape.ts'
import type { ComponentDir } from './reachability.ts'
import { reachableFiles } from './reachability.ts'

export interface TextCatalogueSource {
  /** `app/`: every `.vue` file below it is searched for `<i18n lang="yaml">` blocks. */
  appDir: string
  /** The directory the global locale files are listed in. */
  localesDir: string
  /** Each locale's global files, in merge order. */
  localeFiles: Record<string, readonly string[]>
  /** The `components` option of `nuxt.config.ts`: how Nuxt names a component (`reachability.ts`). */
  componentDirs: readonly ComponentDir[]
}

/**
 * The string leaves of a message tree, by dotted path. Anything else (a
 * boolean flag such as `live: true`, which the components read as data)
 * is not a message and is left out.
 */
export function flattenMessages(tree: unknown, prefix = ''): Map<string, string> {
  const leaves = new Map<string, string>()
  if (typeof tree === 'string') {
    leaves.set(prefix, tree)
  }
  else if (typeof tree === 'object' && tree !== null) {
    for (const [name, child] of Object.entries(tree)) {
      for (const [path, text] of flattenMessages(child, prefix ? `${prefix}.${name}` : name)) {
        leaves.set(path, text)
      }
    }
  }
  return leaves
}

/** Locale → messages of the `<i18n lang="yaml">` blocks of one component. */
export function readBlockMessages(source: string, filename: string, locales: readonly string[]): Map<string, Map<string, string>> {
  const { descriptor, errors } = parse(source, { filename })
  if (errors.length > 0) {
    throw new Error(`${filename}: ${errors[0]!.message}`)
  }
  const perLocale = new Map<string, Map<string, string>>()
  for (const block of descriptor.customBlocks.filter(({ type }) => type === 'i18n')) {
    if (block.lang !== 'yaml') {
      throw new Error(`${filename}: an <i18n> block must be lang="yaml", got ${block.lang ?? 'none'}`)
    }
    const tree: unknown = parseYaml(block.content) ?? {}
    for (const [locale, messages] of Object.entries(tree as object)) {
      if (!locales.includes(locale)) {
        throw new Error(`${filename}: <i18n> block names the locale "${locale}", which the app does not have`)
      }
      const leaves = perLocale.get(locale) ?? new Map<string, string>()
      for (const [path, text] of flattenMessages(messages)) leaves.set(path, text)
      perLocale.set(locale, leaves)
    }
  }
  return perLocale
}

function* vueFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* vueFiles(path)
    else if (entry.name.endsWith('.vue')) yield path
  }
}

/** `app/components/Chrome/Footer.vue` → `components/Chrome/Footer`. */
export function namespaceOf(appDir: string, file: string): string {
  return relative(appDir, file).split(sep).join('/').replace(/\.vue$/, '')
}

/**
 * Every editable message of the app: the `<i18n lang="yaml">` blocks of
 * `app/**` plus the global locale files, with the placeholders of each
 * default. Deterministic: the same tree gives the same bytes, hash
 * included.
 */
export function buildTextCatalogue(source: TextCatalogueSource): TextCatalogue {
  const locales = Object.keys(source.localeFiles)
  const entries = new Map<string, TextCatalogueEntry>()

  const add = (namespace: string, locale: string, key: string, text: string) => {
    const id = `${namespace}\0${key}`
    const entry = entries.get(id) ?? { namespace, key, defaults: {}, placeholders: {}, locked: isLockedText(namespace, key) }
    const { errors, shape } = analyzeMessage(text)
    if (errors.length > 0) {
      throw new Error(`${namespace} ${key} (${locale}) does not compile: ${errors[0]}`)
    }
    entry.defaults[locale] = text
    entry.placeholders[locale] = shape
    entries.set(id, entry)
  }

  for (const file of vueFiles(source.appDir)) {
    const text = readFileSync(file, 'utf8')
    if (!text.includes('<i18n')) continue
    const namespace = namespaceOf(source.appDir, file)
    for (const [locale, leaves] of readBlockMessages(text, file, locales)) {
      for (const [key, message] of leaves) add(namespace, locale, key, message)
    }
  }

  for (const [locale, files] of Object.entries(source.localeFiles)) {
    for (const file of files) {
      const tree: unknown = JSON.parse(readFileSync(join(source.localesDir, file), 'utf8'))
      for (const [key, message] of flattenMessages(tree)) add(GLOBAL_TEXT_NAMESPACE, locale, key, message)
    }
  }

  const sorted = [...entries.values()].sort((a, b) =>
    a.namespace === b.namespace
      ? (a.key < b.key ? -1 : 1)
      : (a.namespace < b.namespace ? -1 : 1),
  )
  const hashOf = (list: readonly TextCatalogueEntry[]) =>
    createHash('sha256').update(JSON.stringify(list)).digest('hex').slice(0, 16)

  // What each store renders: a namespace is listed for a view when a
  // component reachable from that store's roots owns it.
  const views: Record<string, TextCatalogueView> = {}
  for (const [view, files] of reachableFiles(source)) {
    const rendered = new Set([...files].map(file => namespaceOf(source.appDir, file)))
    const inView = sorted.filter(({ namespace }) => namespace === GLOBAL_TEXT_NAMESPACE || rendered.has(namespace))
    views[view] = {
      hash: hashOf(inView),
      namespaces: [...new Set(inView.map(({ namespace }) => namespace))].filter(namespace => namespace !== GLOBAL_TEXT_NAMESPACE),
    }
  }
  return { hash: hashOf(sorted), locales, entries: sorted, views }
}
