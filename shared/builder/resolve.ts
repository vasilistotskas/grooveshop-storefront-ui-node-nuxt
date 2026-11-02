import { DEFAULT_LOCALE } from '../../i18n/locales'
import { BUILDER_DOCUMENT_NODE_ID } from '../constants/builder'
import type { BuilderDocument, BuilderNode } from '../types/builder'
import type { BuilderWorkingCopy } from '../types/builderEditor'

/**
 * A working copy as Django resolves a published document for one language
 * (`builder/published.py: resolve_document`), so the editor's preview is
 * drawn from what the release will hold:
 *
 * - the language's overlay is set over the default content, each pointer
 *   only where its parent exists (`pointers.resolve_concrete`); the default
 *   language has no overlay;
 * - a disabled section or block is dropped with its children, and the
 *   orders keep only what is left;
 * - the document's own settings take the `@document` overlay.
 *
 * Pure, and it never mutates `copy`. What comes back is still unchecked:
 * `parseDocument` makes it safe, exactly as it does a published page.
 */
export function resolveWorkingCopy(copy: BuilderWorkingCopy, locale: string): BuilderDocument {
  const overlay = locale === DEFAULT_LOCALE ? {} : copy.i18n[locale] ?? {}
  const sections: Record<string, BuilderNode> = {}
  for (const id of copy.draft.order) {
    const node = copy.draft.sections[id]
    const resolved = node && resolveNode(id, node, overlay)
    if (resolved) sections[id] = resolved
  }
  return {
    ...(copy.draft.settings && { settings: localised(copy.draft.settings, overlay[BUILDER_DOCUMENT_NODE_ID] ?? {}) }),
    sections,
    order: Object.keys(sections),
  }
}

function resolveNode(id: string, node: BuilderNode, overlay: Readonly<Record<string, Readonly<Record<string, unknown>>>>): BuilderNode | undefined {
  if (node.disabled) return undefined
  const resolved: BuilderNode = { type: node.type, settings: localised(node.settings, overlay[id] ?? {}) }
  if (node.blocks) {
    const blocks: Record<string, BuilderNode> = {}
    for (const childId of node.blockOrder ?? []) {
      const child = node.blocks[childId]
      const kept = child && resolveNode(childId, child, overlay)
      if (kept) blocks[childId] = kept
    }
    resolved.blocks = blocks
    resolved.blockOrder = Object.keys(blocks)
  }
  return resolved
}

/** A copy of `settings` with each overlay pointer's value set where its parent exists. */
function localised(settings: Readonly<Record<string, unknown>>, overrides: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const resolved = structuredClone(settings) as Record<string, unknown>
  for (const [pointer, value] of Object.entries(overrides)) {
    const segments = pointerSegments(pointer)
    const parent = segments && parentOf(resolved, segments)
    if (parent) setAt(parent, segments.at(-1)!, structuredClone(value))
  }
  return resolved
}

/** The segments of an RFC 6901 pointer (`/a/b~1c` is `a`, `b/c`); `undefined` for one that names nothing to set. */
function pointerSegments(pointer: string): string[] | undefined {
  if (!pointer.startsWith('/')) return undefined
  return pointer.slice(1).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))
}

type Container = Record<string, unknown> | unknown[]

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** The object or list the last segment lands in, or `undefined` when a parent is missing (the last segment may be new). */
function parentOf(data: Container, segments: readonly string[]): Container | undefined {
  let cursor: unknown = data
  for (const segment of segments.slice(0, -1)) {
    if (Array.isArray(cursor)) {
      if (!/^\d+$/.test(segment) || Number(segment) >= cursor.length) return undefined
      cursor = cursor[Number(segment)]
    }
    else if (isRecord(cursor) && segment in cursor) {
      cursor = cursor[segment]
    }
    else {
      return undefined
    }
  }
  if (Array.isArray(cursor)) {
    const last = segments.at(-1)!
    return /^\d+$/.test(last) && Number(last) < cursor.length ? cursor : undefined
  }
  return isRecord(cursor) ? cursor : undefined
}

function setAt(parent: Container, segment: string, value: unknown): void {
  if (Array.isArray(parent)) parent[Number(segment)] = value
  else parent[segment] = value
}
