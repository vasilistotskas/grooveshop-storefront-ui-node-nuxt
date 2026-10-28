/**
 * What a message uses besides its words, as `@intlify/message-compiler`
 * reads it (`analyzeMessage`): the tokens a store's replacement must keep
 * and the number of plural cases (the `|` pipes of a plural message plus
 * one; `1` for a message without any).
 */
export interface MessageShape {
  /**
   * Sorted, unique: `named:<name>` for `{name}`, `list:<index>` for `{0}`,
   * `linked:<key>` for `@:key` and `linked:<key>|<modifier>` for
   * `@.modifier:key`. A linked reference to a parameter (`@:{name}`)
   * counts as that parameter.
   */
  params: string[]
  pluralCases: number
}

/** One editable message: a leaf of a component's `<i18n>` block or of a global locale file. */
export interface TextCatalogueEntry {
  /**
   * `global` for the locale files under `i18n/locales/`; for a component
   * block its file path relative to `app/` without `.vue`, with forward
   * slashes (`components/Chrome/Footer`).
   */
  namespace: string
  /** The dotted path of the leaf inside its namespace; an array item is its index (`panel.metrics.3.label`). */
  key: string
  /** The platform's text per locale, for the locales that define the key. */
  defaults: Partial<Record<string, string>>
  /** The shape of each default, per locale. */
  placeholders: Partial<Record<string, MessageShape>>
  /** Only the platform edits a locked text, in code (`LOCKED_TEXTS`). */
  locked: boolean
}

/** Every editable message of one build. Identical for every store. */
export interface TextCatalogue {
  /** Content hash of `entries`: it changes exactly when the catalogue does. */
  hash: string
  locales: string[]
  entries: TextCatalogueEntry[]
}
