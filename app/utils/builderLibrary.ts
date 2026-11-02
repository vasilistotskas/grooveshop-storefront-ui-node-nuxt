/**
 * The text a preset starts with, by the setting's path (`heading`,
 * `prompt.title`): what the store's editor labels hold for it in the
 * language a draft is written in (`presets.<type>.<preset>`).
 */
export type BuilderPresetText = (type: string, preset: string) => Readonly<Record<string, string>> | undefined

/**
 * A new node of `definition` as its preset `presetId` has it: the preset's
 * settings with its text filled in (`text`), and its child blocks, each from
 * its own type's default preset, so a container arrives with something in it.
 * Every node gets a fresh id (`newId`). What comes back is a node a draft
 * save accepts: `test/unit/app/builder/presets.spec.ts` holds every block's
 * default preset to that.
 */
export function builderPresetNode(
  definition: BlockDefinition,
  presetId: string,
  blocks: ReadonlyMap<string, BlockDefinition>,
  text: BuilderPresetText,
  newId: () => string,
): BuilderNode {
  const preset = definition.presets?.find(({ id }) => id === presetId)
  const settings = structuredClone(preset?.settings ?? {}) as Record<string, unknown>
  for (const [path, value] of Object.entries(text(definition.type, presetId) ?? {})) setPath(settings, path, value)
  const node: BuilderNode = { type: `${definition.type}@${definition.version}`, settings }
  const children = (preset?.blocks ?? []).flatMap((child) => {
    const childDefinition = blocks.get(child.type)
    if (!childDefinition) return []
    const built = builderPresetNode(childDefinition, BUILDER_DEFAULT_PRESET, blocks, text, newId)
    return [[newId(), child.settings ? { ...built, settings: { ...built.settings, ...structuredClone(child.settings) } } : built] as const]
  })
  if (children.length > 0) {
    node.blocks = Object.fromEntries(children)
    node.blockOrder = children.map(([id]) => id)
  }
  return node
}

function setPath(settings: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let cursor = settings
  for (const key of keys.slice(0, -1)) {
    const next = cursor[key]
    cursor = (cursor[key] = typeof next === 'object' && next !== null && !Array.isArray(next) ? next : {}) as Record<string, unknown>
  }
  cursor[keys.at(-1)!] = value
}
