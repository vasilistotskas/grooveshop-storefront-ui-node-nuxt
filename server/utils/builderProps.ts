/**
 * The props a section component receives for a parsed node: its settings,
 * and each list of children under the prop the block names for it
 * (`childList`), in order. Exactly the shape `page_config` has always
 * handed the same component, so a section renders the same whichever
 * producer made its data and no component has to read blocks itself.
 *
 * A disabled child is left out, as a hidden slide would be. A block with no
 * children has no list prop at all (an empty list and none render alike).
 * The node must come from `parseDocument`: its types are known and its
 * settings already match their schemas.
 */
export function sectionProps(
  node: BuilderNode,
  registry: ReadonlyMap<string, BlockDefinition> = builderBlocks,
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
  return { ...node.settings, ...lists }
}
