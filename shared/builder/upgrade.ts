import { VERSIONED_BLOCK_TYPE_PATTERN } from '../constants/builder'
import type { BlockDefinition, BuilderNode, BuilderNodeBody } from '../types/builder'

/** A node's `type` split into the block type and its version, or `undefined` for a malformed one. */
export function parseVersionedType(type: string): { type: string, version: number } | undefined {
  const match = VERSIONED_BLOCK_TYPE_PATTERN.exec(type)
  return match ? { type: match[1]!, version: Number(match[2]) } : undefined
}

export function formatVersionedType(type: string, version: number): string {
  return `${type}@${version}`
}

export type BlockUpgradeFailure
  = | 'malformed_type' // not `<type>@<version>`
    | 'type_mismatch' // names another block
    | 'newer_version' // written by a newer build than this one
    | 'no_upgrade_path' // an older version no upgrade function reaches
    | 'invalid_result' // an upgrade function returned no settings object

export class BlockUpgradeError extends Error {
  constructor(readonly code: BlockUpgradeFailure, message: string) {
    super(message)
    this.name = 'BlockUpgradeError'
  }
}

/**
 * Brings a node written for an older version of its block up to the
 * current one by applying `definition.upgrade[n]` for each version from
 * the node's own up to the one before the current. Pure: the node is
 * never touched (each function gets a copy), and one already current is
 * returned as it is.
 *
 * Throws `BlockUpgradeError` for a node it cannot bring up: the callers
 * (`parseDocument` on the server, the editor on load) decide what that
 * means for the page.
 */
export function upgradeNode(
  node: BuilderNode,
  definition: Pick<BlockDefinition, 'type' | 'version' | 'upgrade'>,
): BuilderNode {
  const written = parseVersionedType(node.type)
  if (!written) {
    throw new BlockUpgradeError('malformed_type', `"${node.type}" is not <type>@<version>`)
  }
  if (written.type !== definition.type) {
    throw new BlockUpgradeError('type_mismatch', `"${node.type}" is not a ${definition.type}`)
  }
  if (written.version > definition.version) {
    throw new BlockUpgradeError('newer_version', `${node.type} is newer than ${formatVersionedType(definition.type, definition.version)}`)
  }
  if (written.version === definition.version) {
    return node
  }

  const { type: _, ...copy } = structuredClone(node)
  let body: BuilderNodeBody = copy
  for (let from = written.version; from < definition.version; from++) {
    const step = definition.upgrade?.[from]
    if (!step) {
      throw new BlockUpgradeError('no_upgrade_path', `no upgrade from ${formatVersionedType(definition.type, from)}`)
    }
    body = step(structuredClone(body))
    if (typeof body?.settings !== 'object' || body.settings === null) {
      throw new BlockUpgradeError('invalid_result', `the upgrade from ${formatVersionedType(definition.type, from)} returned no settings`)
    }
  }
  return { type: formatVersionedType(definition.type, definition.version), ...body }
}
