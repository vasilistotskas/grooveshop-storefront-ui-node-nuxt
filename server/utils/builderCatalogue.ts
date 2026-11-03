import { createHash } from 'node:crypto'
import blockList from '#builder-blocks'

/** What `GET /api/builder/catalogue` serves: the catalogue and its hash, as the body and the ETag. */
export interface BuilderCatalogueDocument {
  hash: string
  json: string
}

/**
 * One definition as the catalogue states it: the settings as JSON Schema
 * (`blockSettingsJsonSchema`), with `accepts` and every optional field only
 * when it is set.
 *
 * `accepts` is the current version alone. Django holds this one schema,
 * so it can validate nothing older; an older document is upgraded by the
 * storefront on read and by the editor on load (`upgradeNode`), and
 * always saved at the current version.
 */
function catalogueBlock(definition: BlockDefinition): CatalogueBlock {
  const schema = blockSettingsJsonSchema(definition.schema)
  const { maxDepth } = definition.children
  return {
    type: definition.type,
    version: definition.version,
    accepts: [definition.version],
    schema,
    translatable: [...definition.translatable],
    refs: { ...definition.refs } as Record<string, BlockRefKind>,
    linkRefs: [...definition.linkRefs],
    ...(Object.keys(definition.data).length > 0 && { data: structuredClone(definition.data) }),
    limits: { ...definition.limits },
    children: { allowed: [...definition.children.allowed], ...(maxDepth === undefined ? {} : { maxDepth }) },
    kinds: [...definition.kinds],
    ...(definition.groups && { groups: [...definition.groups] }),
    ...(definition.templates && { templates: [...definition.templates] }),
    ...(definition.feature && { feature: definition.feature }),
    ...(definition.designs && { designs: [...definition.designs] }),
    ...(definition.deprecated && { deprecated: true }),
    ...(definition.presets && { presets: definition.presets.map(preset => structuredClone(preset)) }),
  }
}

/**
 * The catalogue of `definitions`, sorted by type, with a hash of its
 * content that changes exactly when a block does. Deterministic: the same
 * definitions give the same bytes.
 *
 * `documentKinds` states what each kind of document carries at its root
 * (`builderDocumentRootsFor(design)`: the theme's with that design's
 * `contrast` rules and the `defaults` a new store of it starts with), and `templates` the page types the storefront's
 * static routes render (`STATIC_LAYOUT_ROUTES`): a layout of one is the
 * document `template:<pageType>`, any other the custom page
 * `page:<pageType>`, and a block's `templates` names these. Both are part of
 * the hash.
 *
 * Refuses a set that contradicts itself: two blocks of one type, or a
 * block that names as a child a type that is missing or cannot be one.
 */
export function buildBlockCatalogue(
  definitions: readonly BlockDefinition[],
  roots: Partial<Record<BuilderDocumentKind, DocumentRoot>> = BUILDER_DOCUMENT_ROOTS,
  templates: readonly string[] = Object.keys(STATIC_LAYOUT_ROUTES),
): BlockCatalogue {
  const byType = new Map<string, BlockDefinition>()
  for (const definition of definitions) {
    if (byType.has(definition.type)) {
      throw new Error(`The block type "${definition.type}" is defined twice`)
    }
    byType.set(definition.type, definition)
  }
  for (const definition of definitions) {
    for (const child of definition.children.allowed) {
      if (!byType.get(child)?.kinds.includes('block')) {
        throw new Error(`${definition.type} allows "${child}" inside it, which is not a defined block of kind "block"`)
      }
    }
  }
  const blocks = [...byType.values()]
    .sort((a, b) => (a.type < b.type ? -1 : 1))
    .map(catalogueBlock)
  const documentKinds = Object.fromEntries(
    BUILDER_DOCUMENT_KINDS.flatMap((kind) => {
      const root = roots[kind]
      return root
        ? [[kind, { schema: blockSettingsJsonSchema(root.schema), translatable: [...root.translatable], linkRefs: linkPointers(root.schema), ...(root.contrast && { contrast: [...root.contrast] }), ...(root.defaults && { defaults: root.defaults }) }]]
        : []
    }),
  )
  const names = [...templates].sort()
  const dataLimits = { ...DATA_LIMITS }
  const hash = createHash('sha256').update(JSON.stringify({ blocks, dataLimits, documentKinds, templates: names })).digest('hex').slice(0, 16)
  return { hash, blocks, dataLimits, documentKinds, templates: names }
}

/**
 * The definitions a design draws: every one that names no `designs`, and every
 * one that names `design`. Without a design, all of them (the catalogue of the
 * build, for tooling). A block that has a presentation in one design only is
 * declared so (`defineBlock`'s `designs`), and the catalogue of another
 * store's design does not list it: it is neither offered nor accepted there.
 */
export function definitionsForDesign(definitions: readonly BlockDefinition[], design?: string): BlockDefinition[] {
  return definitions.filter(definition => design === undefined || definition.designs === undefined || definition.designs.includes(design))
}

/**
 * Every block of this build: the `*.block.ts` files of `app/blocks`, which
 * `modules/builder-blocks` hands to the server bundle as the `#builder-blocks`
 * virtual module. The one registry `parseDocument` and the catalogue read.
 */
export const builderBlocks: ReadonlyMap<string, BlockDefinition> = new Map(blockList.map(definition => [definition.type, definition]))

function catalogueDocument(design?: string): BuilderCatalogueDocument {
  const { hash, blocks, dataLimits, documentKinds, templates } = buildBlockCatalogue(definitionsForDesign(blockList, design), builderDocumentRootsFor(design), staticLayoutPageTypesFor(design))
  return { hash, json: JSON.stringify({ hash, blocks, dataLimits, documentKinds, templates }) }
}

/** The catalogue of the whole build, without a design: every block and every page type. */
export const builderCatalogueDocument: BuilderCatalogueDocument = catalogueDocument()

const documentsByDesign = new Map<string, BuilderCatalogueDocument>()

/**
 * The catalogue of what the store whose design is `design` draws, and the
 * JSON the endpoint serves. A constant of the server bundle per design, so
 * there is one answer for every store of a design until the next deploy: built
 * the first time it is asked for, and the whole build's at load, so a
 * contradictory set of definitions stops the boot instead of the first
 * request.
 */
export function builderCatalogueDocumentFor(design?: string): BuilderCatalogueDocument {
  if (design === undefined) return builderCatalogueDocument
  let document = documentsByDesign.get(design)
  if (!document) {
    document = catalogueDocument(design)
    documentsByDesign.set(design, document)
  }
  return document
}
