/** One section or block as the editor's outline lists it. */
export interface BuilderOutlineNode {
  /** Unique across the documents the editor holds: `<document key>/<node id>` (`builderNodeRef`). */
  ref: string
  documentKey: string
  nodeId: string
  /** The block type, without its version. */
  blockType: string
  /**
   * The node's own name in the store's default language: the first of its
   * block's `editor.title` settings that has text. Absent when it has none,
   * or when this build does not define the block.
   */
  title?: string
  /** Hidden from shoppers (`disabled`), but kept in the document. */
  hidden: boolean
  children: BuilderOutlineNode[]
}

/** The separator of a node reference: neither a document key nor a node id contains it. */
const REF_SEPARATOR = '/'

/** A node of one of the editor's documents, by reference. */
export function builderNodeRef(documentKey: string, nodeId: string): string {
  return `${documentKey}${REF_SEPARATOR}${nodeId}`
}

/** The document and node a reference names, or `undefined` for something that is not one. */
export function parseBuilderNodeRef(ref: string): { documentKey: string, nodeId: string } | undefined {
  const at = ref.lastIndexOf(REF_SEPARATOR)
  if (at < 0) return undefined
  const documentKey = ref.slice(0, at)
  const nodeId = ref.slice(at + 1)
  return BUILDER_DOCUMENT_KEY_PATTERN.test(documentKey) && BUILDER_NODE_ID_PATTERN.test(nodeId)
    ? { documentKey, nodeId }
    : undefined
}

/** A node's block type, without its version. */
export const builderBlockType = (node: BuilderNode): string => parseVersionedType(node.type)?.type ?? node.type

/**
 * A node's own name in the store's default language: the first of its
 * block's `editor.title` settings that has text; `undefined` when it has none,
 * or when this build does not define the block.
 */
export function builderNodeTitle(node: BuilderNode, blocks: ReadonlyMap<string, BlockDefinition>): string | undefined {
  return blocks.get(builderBlockType(node))?.editor.title
    ?.map(setting => node.settings[setting])
    .find((value): value is string => typeof value === 'string' && value.trim() !== '')
    ?.trim()
}

/** A node of a document by its id, at any depth. */
export function findBuilderNode(draft: BuilderDocument, nodeId: string): BuilderNode | undefined {
  const search = (order: readonly string[], map: Readonly<Record<string, BuilderNode>>): BuilderNode | undefined => {
    for (const id of order) {
      const node = map[id]!
      const found = id === nodeId ? node : node.blockOrder ? search(node.blockOrder, node.blocks!) : undefined
      if (found) return found
    }
    return undefined
  }
  return search(draft.order, draft.sections)
}

function outlineNode(
  documentKey: string,
  nodeId: string,
  node: BuilderNode,
  blocks: ReadonlyMap<string, BlockDefinition>,
): BuilderOutlineNode {
  const blockType = builderBlockType(node)
  const title = builderNodeTitle(node, blocks)
  return {
    ref: builderNodeRef(documentKey, nodeId),
    documentKey,
    nodeId,
    blockType,
    ...(title !== undefined && { title }),
    hidden: node.disabled === true,
    children: (node.blockOrder ?? []).map(childId => outlineNode(documentKey, childId, node.blocks![childId]!, blocks)),
  }
}

/**
 * A document's sections, and the blocks inside each, in their order: what
 * the outline draws for one document. The document is a parsed working copy
 * (`ZodBuilderDraft`), whose orders name every node of their maps.
 */
export function builderOutline(
  documentKey: string,
  document: BuilderDocument,
  blocks: ReadonlyMap<string, BlockDefinition>,
): BuilderOutlineNode[] {
  return document.order.map(id => outlineNode(documentKey, id, document.sections[id]!, blocks))
}

/**
 * The node a problem of a refused save is about, from its JSON pointer into
 * what was sent: the deepest `/sections/<id>` or `/blocks/<id>` of the draft,
 * or the node of an overlay entry (`/i18n/<locale>/<id>/...`). `undefined`
 * for a problem with the document as a whole (its order, its size).
 */
export function builderProblemNodeId(path: string): string | undefined {
  const segments = path.split('/').slice(1)
  if (segments[0] === 'i18n') return segments[2]
  let nodeId: string | undefined
  segments.forEach((segment, index) => {
    if ((segment === 'sections' || segment === 'blocks') && segments[index + 1] !== undefined) nodeId = segments[index + 1]
  })
  return nodeId
}
