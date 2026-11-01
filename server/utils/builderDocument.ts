import * as z from 'zod'

const zDocumentShell = z.object({
  sections: z.record(z.string(), z.unknown()),
  order: z.array(z.string()),
})

const zNodeShell = z.object({
  type: z.string(),
  disabled: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()),
  blocks: z.record(z.string(), z.unknown()).optional(),
  blockOrder: z.array(z.string()).optional(),
})

/** Why a node was left out: the code is stable, the log line carries the detail. */
type SkipReason
  = | BlockUpgradeFailure
    | 'invalid_id'
    | 'invalid_node'
    | 'unknown_type'
    | 'wrong_kind'
    | 'not_allowed'
    | 'invalid_settings'
    | 'upgrade_failed'

function skip(path: string, reason: SkipReason, detail?: string): undefined {
  log.warn({ tag: 'builder', message: 'node skipped', node: path, reason, ...(detail && { detail }) })
}

interface ParseContext {
  registry: ReadonlyMap<string, BlockDefinition>
}

/**
 * One node and, below it, its children; `undefined` (and a warning) when
 * the node cannot be used. `depth` is the node's level (a section is 1) and
 * `depthLimit` the deepest level its ancestors allow.
 */
function parseNode(
  context: ParseContext,
  raw: unknown,
  id: string,
  path: string,
  position: { depth: number, depthLimit: number, kind: BlockKind, allowed?: readonly string[] },
): BuilderNode | undefined {
  if (!BUILDER_NODE_ID_PATTERN.test(id)) return skip(path, 'invalid_id')
  const shell = zNodeShell.safeParse(raw)
  if (!shell.success) return skip(path, 'invalid_node', z.prettifyError(shell.error))

  const written = parseVersionedType(shell.data.type)
  if (!written) return skip(path, 'malformed_type', shell.data.type)
  const definition = context.registry.get(written.type)
  if (!definition) return skip(path, 'unknown_type', shell.data.type)
  if (!definition.kinds.includes(position.kind)) return skip(path, 'wrong_kind', `${written.type} is not a ${position.kind}`)
  if (position.allowed && !position.allowed.includes(written.type)) return skip(path, 'not_allowed', written.type)

  let upgraded: BuilderNode
  try {
    upgraded = upgradeNode(shell.data as BuilderNode, definition)
  }
  catch (error) {
    return error instanceof BlockUpgradeError
      ? skip(path, error.code, error.message)
      : skip(path, 'upgrade_failed', error instanceof Error ? error.message : String(error))
  }

  const settings = definition.schema.safeParse(upgraded.settings)
  if (!settings.success) return skip(path, 'invalid_settings', z.prettifyError(settings.error))

  const depthLimit = Math.min(position.depthLimit, position.depth + (definition.children.maxDepth ?? BUILDER_MAX_NODE_DEPTH))
  const blocks: Record<string, BuilderNode> = {}
  // Kept as a list: an object's keys come back with integer-like ids first.
  const blockOrder: string[] = []
  for (const childId of new Set(upgraded.blockOrder ?? [])) {
    const childPath = `${path}/${childId}`
    if (position.depth >= depthLimit) {
      skip(childPath, 'not_allowed', `nesting stops at level ${depthLimit}`)
      continue
    }
    const child = parseNode(context, upgraded.blocks?.[childId], childId, childPath, {
      depth: position.depth + 1,
      depthLimit,
      kind: 'block',
      allowed: definition.children.allowed,
    })
    if (child) {
      blocks[childId] = child
      blockOrder.push(childId)
    }
  }

  return {
    type: upgraded.type,
    ...(upgraded.disabled && { disabled: true }),
    settings: settings.data,
    ...(blockOrder.length > 0 && { blocks, blockOrder }),
  }
}

/**
 * A stored document made safe to render: every node brought to its
 * block's current version (`upgradeNode`), checked against the block's
 * schema, and rebuilt from the parse, so a key the schema does not know
 * never reaches a component. It is the one producer of document data, on
 * the server and ahead of the cache, which keeps Zod out of the client.
 *
 * A node that cannot be used is left out with a warning, and its
 * children with it: an unknown or newer type, a type that may not sit
 * there, settings that fail their schema, an upgrade that cannot run.
 * One bad node never takes the page down. A document that is not a
 * document at all renders as an empty one. Only what `order` and each
 * node's `blockOrder` name is kept, in that order.
 */
export function parseDocument(raw: unknown, registry: ReadonlyMap<string, BlockDefinition> = builderBlocks): BuilderDocument {
  const shell = zDocumentShell.safeParse(raw)
  if (!shell.success) {
    skip('', 'invalid_node', z.prettifyError(shell.error))
    return { sections: {}, order: [] }
  }
  const sections: Record<string, BuilderNode> = {}
  const order: string[] = []
  for (const id of new Set(shell.data.order)) {
    const section = parseNode({ registry }, shell.data.sections[id], id, id, {
      depth: 1,
      depthLimit: BUILDER_MAX_NODE_DEPTH,
      kind: 'section',
    })
    if (section) {
      sections[id] = section
      order.push(id)
    }
  }
  return { sections, order }
}
