/**
 * The changes the editor makes to a document's structure, as pure functions
 * of a working copy (`draft` and its overlay `i18n`). Each returns a new copy
 * and leaves its argument alone, so the editor's undo history can keep the
 * copies it had. Node ids are unique across a document (Django checks it), so
 * a node is named by its id alone.
 */

/** Where a node sits: its parent (none for a section) and the order it is listed in. */
interface NodePlace {
  node: BuilderNode
  parent?: BuilderNode
  order: string[]
}

function findIn(container: { order: string[], map: Record<string, BuilderNode> }, nodeId: string, parent?: BuilderNode): NodePlace | undefined {
  for (const id of container.order) {
    const node = container.map[id]!
    if (id === nodeId) return { node, parent, order: container.order }
    const below = node.blockOrder?.length
      ? findIn({ order: node.blockOrder, map: node.blocks! }, nodeId, node)
      : undefined
    if (below) return below
  }
  return undefined
}

function placeOf(draft: BuilderDocument, nodeId: string): NodePlace | undefined {
  return findIn({ order: draft.order, map: draft.sections }, nodeId)
}

/** A node and every node below it, depth first. */
function subtree(node: BuilderNode, nodeId: string): Array<{ id: string, node: BuilderNode }> {
  return [
    { id: nodeId, node },
    ...(node.blockOrder ?? []).flatMap(childId => subtree(node.blocks![childId]!, childId)),
  ]
}

/** Every node of a document, depth first. */
function allNodes(draft: BuilderDocument): Array<{ id: string, node: BuilderNode }> {
  return draft.order.flatMap(id => subtree(draft.sections[id]!, id))
}

/** Whether a node can move one place up (`-1`) or down (`1`) among its siblings. */
export function canMoveNode(copy: BuilderWorkingCopy, nodeId: string, delta: -1 | 1): boolean {
  const place = placeOf(copy.draft, nodeId)
  if (!place) return false
  const target = place.order.indexOf(nodeId) + delta
  return target >= 0 && target < place.order.length
}

/** The copy with a node moved one place up or down among its siblings; the copy itself when it cannot move. */
export function moveNode(copy: BuilderWorkingCopy, nodeId: string, delta: -1 | 1): BuilderWorkingCopy {
  if (!canMoveNode(copy, nodeId, delta)) return copy
  const next = structuredClone(copy)
  const { order } = placeOf(next.draft, nodeId)!
  const from = order.indexOf(nodeId)
  order.splice(from, 1)
  order.splice(from + delta, 0, nodeId)
  return next
}

/** The copy with a node hidden from shoppers, or shown again. It stays in the document either way. */
export function setNodeHidden(copy: BuilderWorkingCopy, nodeId: string, hidden: boolean): BuilderWorkingCopy {
  const next = structuredClone(copy)
  const place = placeOf(next.draft, nodeId)
  if (!place) return copy
  if (hidden) place.node.disabled = true
  else delete place.node.disabled
  return next
}

/** The copy without a node, the nodes below it, and their translations. */
export function removeNode(copy: BuilderWorkingCopy, nodeId: string): BuilderWorkingCopy {
  const next = structuredClone(copy)
  const place = placeOf(next.draft, nodeId)
  if (!place) return copy
  const removed = new Set(subtree(place.node, nodeId).map(({ id }) => id))
  const without = <Value>(map: Record<string, Value>, ids: ReadonlySet<string>) =>
    Object.fromEntries(Object.entries(map).filter(([id]) => !ids.has(id)))
  place.order.splice(place.order.indexOf(nodeId), 1)
  if (place.parent) {
    place.parent.blocks = without(place.parent.blocks!, removed)
    if (place.parent.blockOrder!.length === 0) {
      delete place.parent.blocks
      delete place.parent.blockOrder
    }
  }
  else {
    next.draft.sections = without(next.draft.sections, removed)
  }
  next.i18n = Object.fromEntries(Object.entries(next.i18n).map(([locale, nodes]) => [locale, without(nodes, removed)]))
  return next
}

/**
 * Whether one more copy of a node fits its document: its parent's `maxBlocks`
 * and the `maxPerTemplate` of every block type in it, as the catalogue states
 * them. Django checks the same limits, and the settings' own on save.
 */
export function canDuplicateNode(copy: BuilderWorkingCopy, nodeId: string, blocks: ReadonlyMap<string, BlockDefinition>): boolean {
  const place = placeOf(copy.draft, nodeId)
  if (!place) return false
  const parentLimit = place.parent ? blocks.get(builderBlockType(place.parent))?.limits.maxBlocks : undefined
  if (parentLimit !== undefined && place.order.length >= parentLimit) return false
  const added = subtree(place.node, nodeId).map(({ node }) => builderBlockType(node))
  const present = allNodes(copy.draft).map(({ node }) => builderBlockType(node))
  return [...new Set(added)].every((type) => {
    const limit = blocks.get(type)?.limits.maxPerTemplate
    const count = (types: string[]) => types.filter(other => other === type).length
    return limit === undefined || count(present) + count(added) <= limit
  })
}

/**
 * The copy with a node copied right after it, the nodes below it and their
 * translations with it, under fresh ids (`newId`). Answers the copy and the
 * new node's id.
 */
export function duplicateNode(
  copy: BuilderWorkingCopy,
  nodeId: string,
  newId: () => string,
): { copy: BuilderWorkingCopy, nodeId: string } {
  const next = structuredClone(copy)
  const place = placeOf(next.draft, nodeId)
  if (!place) return { copy, nodeId }
  const ids = new Map(subtree(place.node, nodeId).map(({ id }) => [id, newId()]))
  const renamed = (node: BuilderNode): BuilderNode => {
    const clone = structuredClone(node)
    if (clone.blockOrder) {
      clone.blocks = Object.fromEntries(clone.blockOrder.map(childId => [ids.get(childId)!, renamed(node.blocks![childId]!)]))
      clone.blockOrder = clone.blockOrder.map(childId => ids.get(childId)!)
    }
    return clone
  }
  const id = ids.get(nodeId)!
  place.order.splice(place.order.indexOf(nodeId) + 1, 0, id)
  if (place.parent) place.parent.blocks![id] = renamed(place.node)
  else next.draft.sections[id] = renamed(place.node)
  for (const nodes of Object.values(next.i18n)) {
    for (const [from, to] of ids) {
      if (nodes[from]) nodes[to] = structuredClone(nodes[from])
    }
  }
  return { copy: next, nodeId: id }
}

/** Whether two working copies hold the same document and translations. */
export function sameWorkingCopy(a: BuilderWorkingCopy, b: BuilderWorkingCopy): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * A draft with every node brought to its block's current version
 * (`upgradeNode`), which is the only version Django accepts in a save; or
 * `undefined` when a node cannot be brought there (a type this build does not
 * define, a newer version, a missing upgrade step). Such a draft cannot be
 * saved by this editor, so it is not opened.
 */
export function upgradeDraft(draft: BuilderDocument, blocks: ReadonlyMap<string, BlockDefinition>): BuilderDocument | undefined {
  const upgrade = (node: BuilderNode): BuilderNode | undefined => {
    const definition = blocks.get(builderBlockType(node))
    if (!definition) return undefined
    let current: BuilderNode
    try {
      current = upgradeNode(node, definition)
    }
    catch {
      return undefined
    }
    if (!current.blockOrder) return current
    const children = current.blockOrder.map(id => [id, upgrade(current.blocks![id]!)] as const)
    if (children.some(([, child]) => child === undefined)) return undefined
    return { ...current, blocks: Object.fromEntries(children) as Record<string, BuilderNode> }
  }
  const sections = draft.order.map(id => [id, upgrade(draft.sections[id]!)] as const)
  if (sections.some(([, section]) => section === undefined)) return undefined
  return { ...draft, sections: Object.fromEntries(sections) as Record<string, BuilderNode> }
}

/**
 * The sections two versions of a document disagree on, in the order the
 * first lists them, then the ones only the second has: added, removed, or
 * changed anywhere inside (settings, blocks, translations).
 */
export function changedSections(mine: BuilderWorkingCopy, theirs: BuilderWorkingCopy): string[] {
  const translationsOf = (copy: BuilderWorkingCopy, id: string) =>
    Object.fromEntries(Object.entries(copy.i18n).map(([locale, nodes]) => [locale, subtreeIds(copy.draft, id).map(nodeId => nodes[nodeId])]))
  const fingerprint = (copy: BuilderWorkingCopy, id: string) => JSON.stringify([copy.draft.sections[id], translationsOf(copy, id)])
  const ids = [...new Set([...mine.draft.order, ...theirs.draft.order])]
  return ids.filter(id => fingerprint(mine, id) !== fingerprint(theirs, id))
}

function subtreeIds(draft: BuilderDocument, sectionId: string): string[] {
  const section = draft.sections[sectionId]
  return section ? subtree(section, sectionId).map(({ id }) => id) : []
}

/** A setting's value by its path (`prompt.title`), or `undefined` when the node does not hold one. */
export function settingAt(settings: Readonly<Record<string, unknown>>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) =>
    typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>)[key] : undefined, settings)
}

/**
 * The copy with one setting of a node changed, by its path (`prompt.title`).
 * `undefined`, an empty text and an empty list take the setting out, so the
 * section component falls back to its own default; an object left with no
 * settings goes with it.
 */
export function setNodeSetting(copy: BuilderWorkingCopy, nodeId: string, path: string, value: unknown): BuilderWorkingCopy {
  const next = structuredClone(copy)
  const place = placeOf(next.draft, nodeId)
  if (!place) return copy
  const keys = path.split('.')
  const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
  const write = (settings: Record<string, unknown>, depth: number): Record<string, unknown> => {
    const key = keys[depth]!
    const rest = Object.fromEntries(Object.entries(settings).filter(([name]) => name !== key))
    if (depth === keys.length - 1) return empty ? rest : { ...settings, [key]: structuredClone(value) }
    const child = settings[key]
    const inner = write(typeof child === 'object' && child !== null && !Array.isArray(child) ? child as Record<string, unknown> : {}, depth + 1)
    return Object.keys(inner).length === 0 ? rest : { ...settings, [key]: inner }
  }
  place.node.settings = write(place.node.settings, 0)
  return next
}
