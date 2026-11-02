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

function outlineNode(
  documentKey: string,
  nodeId: string,
  node: BuilderNode,
  blocks: ReadonlyMap<string, BlockDefinition>,
): BuilderOutlineNode {
  const blockType = parseVersionedType(node.type)?.type ?? node.type
  const title = blocks.get(blockType)?.editor.title
    ?.map(setting => node.settings[setting])
    .find((value): value is string => typeof value === 'string' && value.trim() !== '')
  return {
    ref: builderNodeRef(documentKey, nodeId),
    documentKey,
    nodeId,
    blockType,
    ...(title !== undefined && { title: title.trim() }),
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
