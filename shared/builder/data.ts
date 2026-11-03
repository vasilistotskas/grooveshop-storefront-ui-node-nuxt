import { DATA_RECORD_KINDS } from '../constants/builder'
import type { BlockDefinition, BuilderDocument, BuilderNode, DataDeclaration, DataRecordKind, DataSource } from '../types/builder'
import type { DataIssue, DataPlan, DataResolution, DataSite, QueryAnswer, QueryDemand, ResolvedQuery, ResolvedRef } from '../types/builderData'
import { QUERY_RECORD_KIND } from './dataSources'
import { parseVersionedType } from './upgrade'

/**
 * The pure half of the data resolver, shared by the server and the editor:
 * which data settings a document has (`dataSites`), what reading them takes
 * (`planData`), and the document with them replaced by what was read
 * (`applyData`). The reads themselves are the server's (`server/utils/builderData`).
 *
 * A data setting stores an id or a descriptor and the component receives
 * `ResolvedRef` / `ResolvedQuery` under the same name, so the stored value
 * never reaches a component and a resolved one is never stored.
 */

const HIDE: unique symbol = Symbol('hide the node or the list entry')

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Whether `kind` is one a page reads by id (`DATA_RECORD_KINDS`). */
export const isDataRecordKind = (kind: string): kind is DataRecordKind => (DATA_RECORD_KINDS as readonly string[]).includes(kind)

/** A hand-picked list: the merchant's ids, in the merchant's order. */
function pickedIds(value: unknown): number[] | undefined {
  if (!isObject(value) || value.mode !== 'picked' || !Array.isArray(value.ids)) return undefined
  return [...new Set(value.ids.filter((id): id is number => typeof id === 'number'))]
}

/** The value in canonical form: keys sorted, and a list of ids a set (sorted, each once), so equal descriptors give equal text. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(canonical)
    return items.every(item => typeof item === 'number') ? [...new Set(items)].sort((a, b) => a - b) : items
  }
  if (isObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  }
  return value
}

/** The key of a list to read: the source and its descriptor in canonical form. Two settings that ask for the same list share one read. */
export function canonicalQuery(source: DataSource, descriptor: unknown): string {
  return `${source}:${JSON.stringify(canonical(descriptor))}`
}

/** `[concrete pointer, value]` for every place `segments` reaches in `value`, a `*` standing for each entry of a list. */
function* expand(value: unknown, segments: readonly string[], at: string): Generator<[string, unknown]> {
  if (segments.length === 0) {
    yield [at, value]
    return
  }
  const [head, ...rest] = segments as [string, ...string[]]
  if (head === '*' && Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* expand(item, rest, `${at}/${index}`)
  }
  else if (isObject(value) && head in value) {
    yield* expand(value[head], rest, `${at}/${head}`)
  }
}

const segmentsOf = (pointer: string): string[] => pointer.split('/').slice(1)

function definitionOf(node: BuilderNode, registry: ReadonlyMap<string, BlockDefinition>): BlockDefinition | undefined {
  return registry.get(parseVersionedType(node.type)?.type ?? '')
}

/** The nodes a page draws: a disabled node and everything under it is not read. */
function forEachNode(
  document: BuilderDocument,
  visit: (node: BuilderNode, path: readonly string[]) => void,
): void {
  const walk = (node: BuilderNode, path: readonly string[]): void => {
    if (node.disabled) return
    visit(node, path)
    for (const [id, child] of Object.entries(node.blocks ?? {})) walk(child, [...path, id])
  }
  for (const id of document.order) {
    const section = document.sections[id]
    if (section) walk(section, [id])
  }
}

/** Every data setting the page draws, with its value. */
export function dataSites(document: BuilderDocument, registry: ReadonlyMap<string, BlockDefinition>): DataSite[] {
  const sites: DataSite[] = []
  forEachNode(document, (node, nodePath) => {
    const definition = definitionOf(node, registry)
    if (!definition) return
    for (const [pointer, declaration] of Object.entries(definition.data)) {
      for (const [concrete, value] of expand(node.settings, segmentsOf(pointer), '')) {
        sites.push({ nodePath, pointer: concrete, declaration, value })
      }
    }
  })
  return sites
}

/**
 * What reading the sites takes: every id of a kind in ONE set (a `ref`, and a
 * hand-picked list of that kind's source), and each distinct list once. A
 * `ref` of a kind the page cannot read by id is left to `applyData`, which
 * answers it `failed`.
 */
export function planData(sites: readonly DataSite[]): DataPlan {
  const ids: Record<DataRecordKind, Set<number>> = { product: new Set(), blogPost: new Set(), category: new Set(), blogCategory: new Set() }
  const queries = new Map<string, QueryDemand>()
  for (const { declaration, value } of sites) {
    if (declaration.field === 'ref') {
      if (isDataRecordKind(declaration.kind) && typeof value === 'number') ids[declaration.kind].add(value)
      continue
    }
    const picked = pickedIds(value)
    const kind = QUERY_RECORD_KIND[declaration.source]
    if (picked && kind) {
      for (const id of picked) ids[kind].add(id)
      continue
    }
    const key = canonicalQuery(declaration.source, value)
    queries.set(key, { source: declaration.source, descriptor: value, key })
  }
  const sorted = (set: Set<number>) => [...set].sort((a, b) => a - b)
  return {
    ids: { product: sorted(ids.product), blogPost: sorted(ids.blogPost), category: sorted(ids.category), blogCategory: sorted(ids.blogCategory) },
    queries,
  }
}

function resolveRef(kind: string, id: unknown, resolution: DataResolution): ResolvedRef<unknown> {
  if (!isDataRecordKind(kind) || typeof id !== 'number') return { status: 'failed' }
  const records = resolution.records[kind]
  if (records === 'failed') return { status: 'failed' }
  return records.has(id) ? { status: 'ok', value: records.get(id) } : { status: 'missing' }
}

function resolveQuery(source: DataSource, value: unknown, resolution: DataResolution): ResolvedQuery<unknown> {
  const picked = pickedIds(value)
  const kind = QUERY_RECORD_KIND[source]
  let answer: QueryAnswer<unknown> | 'failed'
  if (picked && kind) {
    const records = resolution.records[kind]
    const items = records === 'failed' ? undefined : picked.flatMap(id => records.has(id) ? [records.get(id)] : [])
    answer = items ? { items, total: items.length } : 'failed'
  }
  else {
    answer = resolution.queries.get(canonicalQuery(source, value)) ?? 'failed'
  }
  if (answer === 'failed') return { status: 'failed', items: [], total: 0, descriptor: value }
  return { status: answer.items.length > 0 ? 'ok' : 'empty', items: answer.items, total: answer.total, descriptor: value }
}

interface Applying {
  registry: ReadonlyMap<string, BlockDefinition>
  resolution: DataResolution
  keepHidden: boolean
  issues: DataIssue[]
}

/** `value` with the setting at `segments` replaced by what `replace` answers, or `HIDE` to take out the entry of the nearest list, else the node. */
function mapAt(
  value: unknown,
  segments: readonly string[],
  at: string,
  replace: (current: unknown, pointer: string) => unknown,
): unknown {
  if (segments.length === 0) return replace(value, at)
  const [head, ...rest] = segments as [string, ...string[]]
  if (head === '*' && Array.isArray(value)) {
    return value.map((item, index) => mapAt(item, rest, `${at}/${index}`, replace)).filter(item => item !== HIDE)
  }
  if (isObject(value) && head in value) {
    const next = mapAt(value[head], rest, `${at}/${head}`, replace)
    if (next === HIDE) return HIDE
    return next === value[head] ? value : { ...value, [head]: next }
  }
  return value
}

function applyNode(node: BuilderNode, path: readonly string[], applying: Applying): BuilderNode | typeof HIDE {
  const definition = definitionOf(node, applying.registry)
  let settings = node.settings
  if (definition) {
    for (const [pointer, declaration] of Object.entries(definition.data)) {
      const next = mapAt(settings, segmentsOf(pointer), '', (value, at) => replaceSetting(declaration, value, path, at, applying))
      if (next === HIDE) return HIDE
      settings = next as Record<string, unknown>
    }
  }
  if (!node.blocks) return { ...node, settings }
  const blocks: Record<string, BuilderNode> = {}
  const hidden = new Set<string>()
  for (const [id, child] of Object.entries(node.blocks)) {
    // A disabled child is not drawn and was not read.
    const applied = child.disabled ? child : applyNode(child, [...path, id], applying)
    if (applied === HIDE) hidden.add(id)
    else blocks[id] = applied
  }
  return {
    ...node,
    settings,
    blocks,
    ...(node.blockOrder && { blockOrder: node.blockOrder.filter(id => !hidden.has(id)) }),
  }
}

function replaceSetting(
  declaration: DataDeclaration,
  value: unknown,
  nodePath: readonly string[],
  pointer: string,
  { resolution, keepHidden, issues }: Applying,
): unknown {
  const resolved = declaration.field === 'ref'
    ? resolveRef(declaration.kind, value, resolution)
    : resolveQuery(declaration.source, value, resolution)
  if (resolved.status === 'ok') return resolved
  issues.push({ nodePath, pointer, declaration, status: resolved.status })
  const policy = declaration.field === 'ref' ? declaration.onMissing : declaration.onEmpty
  // A read that failed is never an absence: the node stays, and the component draws nothing for it.
  if (resolved.status !== 'failed' && policy === 'hide' && !keepHidden) return HIDE
  return resolved
}

/**
 * The document with every data setting replaced by what was read for it
 * (`ResolvedRef` / `ResolvedQuery`), and each one that has nothing to show
 * reported. A setting declared `hide` takes out the node that holds it (the
 * entry, when it sits in a list of the node's settings) unless `keepHidden`:
 * the editor's canvas keeps the node, so the merchant sees why it is empty.
 * A setting that `failed` is never taken out.
 */
export function applyData(
  document: BuilderDocument,
  registry: ReadonlyMap<string, BlockDefinition>,
  resolution: DataResolution,
  { keepHidden = false }: { keepHidden?: boolean } = {},
): { document: BuilderDocument, issues: DataIssue[] } {
  const applying: Applying = { registry, resolution, keepHidden, issues: [] }
  const applied: Record<string, BuilderNode> = {}
  const hidden = new Set<string>()
  for (const id of document.order) {
    const section = document.sections[id]
    if (!section || section.disabled) continue
    const result = applyNode(section, [id], applying)
    if (result === HIDE) hidden.add(id)
    else applied[id] = result
  }
  const sections = Object.fromEntries(Object.entries(document.sections).filter(([id]) => !hidden.has(id)).map(([id, section]) => [id, applied[id] ?? section]))
  return {
    document: { ...document, sections, order: document.order.filter(id => !hidden.has(id)) },
    issues: applying.issues,
  }
}
