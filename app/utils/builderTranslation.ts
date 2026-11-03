/**
 * A document's translations, as the page editor writes them: the overlay of
 * a working copy (`i18n[locale][node id][pointer]`, `BuilderOverlay`) holds
 * the text of each translatable setting (a block's `translatable` pointers)
 * in a language other than the draft's, which is the platform's default
 * language (`DEFAULT_LOCALE`, Django's `PARLER_DEFAULT_LANGUAGE_CODE`). A
 * setting with no entry falls back to the draft's text, as the published
 * pages read it. Layout is never per language: only these settings are.
 */

/** Whether a value says nothing: no value, an empty text or an empty list, which a setting holds as absent. */
const isEmptyValue = (value: unknown): boolean =>
  value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

/** A setting's value in the settings object by its pointer (`/prompt/title`). */
function valueAtPointer(settings: Readonly<Record<string, unknown>>, pointer: SettingsPointer): unknown {
  return settingAt(settings, pointer.slice(1).split('/').join('.'))
}

/** A node's translation of the setting at `pointer` in `locale`, when it has one. */
export function builderTranslationAt(copy: BuilderWorkingCopy, locale: string, nodeId: string, pointer: SettingsPointer): unknown {
  return copy.i18n[locale]?.[nodeId]?.[pointer]
}

/**
 * The copy with a node's translation of one setting set, or taken out with
 * an empty value (the setting then falls back to the draft's text). A node
 * or a language left with no translation goes with it.
 */
export function setNodeTranslation(copy: BuilderWorkingCopy, locale: string, nodeId: string, pointer: SettingsPointer, value: unknown): BuilderWorkingCopy {
  const next = structuredClone(copy)
  const without = <Value>(map: Readonly<Record<string, Value>>, key: string): Record<string, Value> =>
    Object.fromEntries(Object.entries(map).filter(([name]) => name !== key))
  const current = next.i18n[locale]?.[nodeId] ?? {}
  const entries = isEmptyValue(value) ? without(current, pointer) : { ...current, [pointer]: structuredClone(value) }
  const otherNodes = without(next.i18n[locale] ?? {}, nodeId)
  const nodes = Object.keys(entries).length === 0 ? otherNodes : { ...otherNodes, [nodeId]: entries }
  next.i18n = Object.keys(nodes).length === 0 ? without(next.i18n, locale) : { ...next.i18n, [locale]: nodes }
  return next
}

/**
 * A node's settings as a language reads them: the draft's, with each
 * translation it has in place of the draft's text. What the form checks
 * against the block's schema while a language is edited.
 */
export function builderTranslatedSettings(settings: Readonly<Record<string, unknown>>, translations: Readonly<Record<string, unknown>> | undefined): Record<string, unknown> {
  const merged = structuredClone(settings) as Record<string, unknown>
  for (const [pointer, value] of Object.entries(translations ?? {})) {
    const keys = pointer.slice(1).split('/')
    let target = merged
    for (const key of keys.slice(0, -1)) {
      const child = target[key]
      target = (target[key] = typeof child === 'object' && child !== null && !Array.isArray(child) ? child : {}) as Record<string, unknown>
    }
    target[keys.at(-1)!] = value
  }
  return merged
}

/**
 * How many settings of a document still need a translation into `locale`:
 * every translatable setting of every node that has text in the draft and
 * none in that language. A block this build does not define counts nothing.
 */
export function builderMissingTranslations(copy: BuilderWorkingCopy, locale: string, blocks: ReadonlyMap<string, BlockDefinition>): number {
  const count = (order: readonly string[], map: Readonly<Record<string, BuilderNode>>): number => order.reduce((total, id) => {
    const node = map[id]
    if (!node) return total
    const definition = blocks.get(builderBlockType(node))
    const missing = (definition?.translatable ?? []).filter(pointer =>
      !isEmptyValue(valueAtPointer(node.settings, pointer)) && isEmptyValue(builderTranslationAt(copy, locale, id, pointer))).length
    return total + missing + count(node.blockOrder ?? [], node.blocks ?? {})
  }, 0)
  return count(copy.draft.order, copy.draft.sections)
}

/**
 * What a settings form needs while a language other than the draft's is
 * edited: the draft's settings, which an untranslated field shows and falls
 * back to, and which settings are translatable (the others are the same in
 * every language, so they are shown and not changed).
 */
export interface BuilderSettingsTranslation {
  fallback: Readonly<Record<string, unknown>>
  translatable: ReadonlySet<SettingsPointer>
}
