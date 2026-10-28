import { isMessageAST, isMessageFunction } from '@intlify/core-base'
import type { Composer } from 'vue-i18n'

/** A store's replacement texts: namespace → key → text (`GET /api/texts/overrides`). */
export type TextOverrides = Record<string, Record<string, string>>

/** The part of a vue-i18n composer a merge touches. */
export type MessageComposer = Pick<Composer, 'getLocaleMessage' | 'mergeLocaleMessage'>

/** A message, as the build keeps it: the source string, a compiled function or an AST. */
function isMessage(node: unknown): boolean {
  return typeof node === 'string' || isMessageFunction(node) || isMessageAST(node)
}

/** The node at the dotted `key` of a message tree, own properties only. */
function nodeAt(tree: unknown, key: string): unknown {
  let node = tree
  for (const segment of key.split('.')) {
    if (typeof node !== 'object' || node === null || isMessageAST(node) || !Object.hasOwn(node, segment)) return undefined
    node = (node as Record<string, unknown>)[segment]
  }
  return node
}

/**
 * Merge a store's texts for `namespace` into `composer`, for `locale`.
 *
 * Django hands the texts over as stored: it filters neither a locked text
 * nor a key this build no longer has. Both are dropped here, where the
 * message is rendered: a locked text (`isLockedText`) is never replaced,
 * and a key that is not a message of the composer's own tree is not
 * added, so a stale override can neither add a key nor replace a group of
 * them.
 *
 * Merged AFTER the composer exists, never passed as `useI18n({ messages })`:
 * vue-i18n copies a component's `<i18n>` block over `options.messages`.
 * The texts stay raw strings; the message compiler that already ships
 * compiles them.
 */
export function mergeStoreTexts(composer: MessageComposer, locale: string, namespace: string, texts: Record<string, string> | undefined): void {
  if (!texts) return
  const defaults = composer.getLocaleMessage(locale)
  const tree: Record<string, unknown> = {}
  for (const [key, text] of Object.entries(texts)) {
    if (isLockedText(namespace, key) || !isMessage(nodeAt(defaults, key))) continue
    const segments = key.split('.')
    const leaf = segments.pop()!
    let branch = tree
    for (const segment of segments) {
      branch = (branch[segment] ??= {}) as Record<string, unknown>
    }
    branch[leaf] = text
  }
  if (Object.keys(tree).length > 0) composer.mergeLocaleMessage(locale, tree)
}
