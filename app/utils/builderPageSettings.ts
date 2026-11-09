/**
 * A page's own settings in the editor: the root settings of a page or
 * template document (`BUILDER_DOCUMENT_ROOTS`, its search-engine copy and
 * its `heading`), as the page-settings panel shows and writes them. Every
 * one is a text, translatable, in the draft's settings or the translation
 * overlay under `BUILDER_DOCUMENT_NODE_ID`.
 */

/** One text the panel edits: the setting's name and the most characters it holds, from the root's schema. */
export interface BuilderPageSettingField {
  key: string
  maxLength?: number
}

/**
 * The texts a document's panel edits, in the root schema's order: every
 * translatable text setting of its kind, without `heading` where its body
 * draws no fallback h1 (`BUILDER_HEADING_DOCUMENTS`). Empty for a document
 * kind with no such root (the theme, a section group).
 */
export function builderPageSettingFields(documentKey: string): BuilderPageSettingField[] {
  const root = BUILDER_DOCUMENT_ROOTS[parseBuilderDocumentKey(documentKey).kind]
  if (!root) return []
  const properties = (blockSettingsJsonSchema(root.schema).properties ?? {}) as Record<string, { type?: string, maxLength?: number }>
  const translatable = new Set(root.translatable)
  return Object.entries(properties)
    .filter(([key, property]) => property.type === 'string' && translatable.has(`/${key}`))
    .filter(([key]) => key !== 'heading' || BUILDER_HEADING_DOCUMENTS.has(documentKey))
    .map(([key, property]) => ({ key, maxLength: property.maxLength }))
}

/** A root setting's text: the draft's, or its translation into `locale` when that is not the draft's language. */
export function builderPageSettingValue(copy: BuilderWorkingCopy, key: string, locale?: string): string {
  const value = locale === undefined
    ? copy.draft.settings?.[key]
    : builderTranslationAt(copy, locale, BUILDER_DOCUMENT_NODE_ID, `/${key}`)
  return typeof value === 'string' ? value : ''
}

/**
 * The copy with one root setting set: in the draft, or as its translation
 * into `locale`. An empty text takes the setting out (a translation then
 * falls back to the draft's), and a draft left with no root settings drops
 * its `settings`.
 */
export function setBuilderPageSetting(copy: BuilderWorkingCopy, key: string, value: string, locale?: string): BuilderWorkingCopy {
  if (locale !== undefined) return setNodeTranslation(copy, locale, BUILDER_DOCUMENT_NODE_ID, `/${key}`, value)
  const { [key]: _, ...others } = copy.draft.settings ?? {}
  const settings = value === '' ? others : { ...others, [key]: value }
  const { settings: __, ...draft } = copy.draft
  return { ...copy, draft: Object.keys(settings).length ? { ...draft, settings } : draft }
}

/**
 * The root setting a problem Django named points at, when it is one of the
 * document's own: `/settings/<key>` in the draft, or
 * `/i18n/<locale>/@document/<pointer>` in the language being edited.
 */
export function builderProblemPageSetting(pointer: string, locale?: string): string | undefined {
  const segments = pointer.split('/').slice(1)
  if (segments[0] === 'settings' && locale === undefined) return segments[1]
  return locale === undefined ? undefined : builderProblemSettingPath(pointer, BUILDER_DOCUMENT_NODE_ID, locale)?.split('.')[0]
}
