/**
 * TRANSITIONAL (P15 stage 2; deleted with `BlockConfig.legacyImages` at
 * stage 4, once no stored document holds an old image setting).
 *
 * The read adapter: a node that still stores an image as a URL
 * (`legacyImages[].from`) and has no media reference yet (`to`) gets the
 * same shape a resolved reference has, `{ status: 'ok', value: { path, alt } }`,
 * so a section component reads ONE shape and never a URL. A node whose new
 * setting is present ignores the old one. The old settings (and the old alt
 * text) are always taken out of the props: components do not declare them,
 * and an undeclared prop would fall onto the section's element as an attribute.
 *
 * It runs after `applyData` on the document the resolver was given, whose
 * overlay is already merged: an alt text read here is in the page's language.
 */
const isList = (pointer: string) => pointer.endsWith('/*')
const nameOf = (pointer: string) => pointer.split('/')[1]!

function adaptSettings(settings: Record<string, unknown>, images: readonly LegacyImage[]): Record<string, unknown> {
  const added: Record<string, unknown> = {}
  const dropped = new Set<string>()
  for (const { from, to, alt } of images) {
    const [old, next] = [nameOf(from), nameOf(to)]
    if (settings[next] === undefined) {
      const url = settings[old]
      if (isList(from) && Array.isArray(url)) {
        // An empty entry keeps its place (and draws the fallback, as an empty URL did): the desk and phone lists pair by position.
        added[next] = url.map((entry): ResolvedImage => typeof entry === 'string' && entry !== ''
          ? { status: 'ok', value: { path: entry, alt: '' } }
          : { status: 'missing' })
      }
      else if (!isList(from) && typeof url === 'string' && url !== '') {
        const text = alt === undefined ? undefined : settings[nameOf(alt)]
        added[next] = { status: 'ok', value: { path: url, alt: typeof text === 'string' ? text : '' } } satisfies ResolvedImage
      }
    }
    dropped.add(old)
    if (alt !== undefined) dropped.add(nameOf(alt))
  }
  return { ...Object.fromEntries(Object.entries(settings).filter(([name]) => !dropped.has(name))), ...added }
}

function adaptNode(node: BuilderNode, registry: ReadonlyMap<string, BlockDefinition>): BuilderNode {
  const images = registry.get(parseVersionedType(node.type)?.type ?? '')?.legacyImages
  const settings = images?.length ? adaptSettings(node.settings, images) : node.settings
  if (!node.blocks) return settings === node.settings ? node : { ...node, settings }
  return {
    ...node,
    settings,
    blocks: Object.fromEntries(Object.entries(node.blocks).map(([id, child]) => [id, adaptNode(child, registry)])),
  }
}

/** `document` with every old image setting handed on as a resolved media reference (see the file's header). */
export function legacyImageRefs(document: BuilderDocument, registry: ReadonlyMap<string, BlockDefinition>): BuilderDocument {
  return {
    ...document,
    sections: Object.fromEntries(Object.entries(document.sections).map(([id, section]) => [id, adaptNode(section, registry)])),
  }
}
