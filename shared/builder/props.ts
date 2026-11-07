import type { BlockDefinition, BuilderNode } from '../types/builder'
import { readyActions } from './actions'
import { parseVersionedType } from './upgrade'

/**
 * The props a section component receives for a parsed node: its settings,
 * and each list of children under the prop the block names for it
 * (`childList`), in order: the flat props shape the section components
 * were written against, so no component has to read blocks itself.
 *
 * A disabled child is left out, as a hidden slide would be. A block with no
 * children has no list prop at all (an empty list and none render alike).
 * The node must come from `parseDocument`: its types are known and its
 * settings already match their schemas. An action with nothing to act on is
 * left out (`readyActions`), so a component's own test for a button holds.
 */
export function sectionProps(
  node: BuilderNode,
  registry: ReadonlyMap<string, BlockDefinition>,
): Record<string, unknown> {
  const definition = registry.get(parseVersionedType(node.type)?.type ?? '')
  const lists: Record<string, Record<string, unknown>[]> = {}
  for (const id of node.blockOrder ?? []) {
    const child = node.blocks?.[id]
    const list = definition && child && !child.disabled
      ? definition.childList[parseVersionedType(child.type)?.type ?? '']
      : undefined
    if (list && child) {
      (lists[list] ??= []).push(sectionProps(child, registry))
    }
  }
  return { ...(definition ? readyActions(node.settings, definition) : node.settings), ...lists }
}
