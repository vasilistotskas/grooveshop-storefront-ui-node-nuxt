import { createHash } from 'node:crypto'
import * as z from 'zod'
import blockList from '#builder-blocks'

/** What `GET /api/builder/catalogue` serves: the catalogue and its hash, as the body and the ETag. */
export interface BuilderCatalogueDocument {
  hash: string
  json: string
}

/**
 * One definition as the catalogue states it: the settings as JSON Schema,
 * with `accepts` and every optional field only when it is set.
 *
 * The schema is the INPUT type (`io: 'input'`): what the editor saves and
 * Django validates is the raw settings, in which a field with a default
 * may be absent (the output type would require it). The input conversion
 * leaves objects open, and a closed contract is the point (an unknown
 * key is refused on save), so every object schema is closed here.
 *
 * `accepts` is the current version alone. Django holds this one schema,
 * so it can validate nothing older; an older document is upgraded by the
 * storefront on read and by the editor on load (`upgradeNode`), and
 * always saved at the current version.
 */
function settingsJsonSchema(schema: z.ZodObject): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: 'input',
    override: ({ jsonSchema }) => {
      if (jsonSchema.type === 'object' && jsonSchema.additionalProperties === undefined) {
        jsonSchema.additionalProperties = false
      }
    },
  })
}

function catalogueBlock(definition: BlockDefinition): CatalogueBlock {
  const schema = settingsJsonSchema(definition.schema)
  const { maxDepth } = definition.children
  return {
    type: definition.type,
    version: definition.version,
    accepts: [definition.version],
    schema,
    translatable: [...definition.translatable],
    refs: { ...definition.refs } as Record<string, BlockRefKind>,
    limits: { ...definition.limits },
    children: { allowed: [...definition.children.allowed], ...(maxDepth === undefined ? {} : { maxDepth }) },
    kinds: [...definition.kinds],
    ...(definition.groups && { groups: [...definition.groups] }),
    ...(definition.templates && { templates: [...definition.templates] }),
    ...(definition.feature && { feature: definition.feature }),
    ...(definition.deprecated && { deprecated: true }),
  }
}

/**
 * The catalogue of `definitions`, sorted by type, with a hash of its
 * content that changes exactly when a block does. Deterministic: the same
 * definitions give the same bytes.
 *
 * `documentKinds` states what each kind of document carries at its root
 * (`BUILDER_DOCUMENT_ROOTS`), and, for a template, `keys`: the page types the
 * storefront's static routes render (`STATIC_LAYOUT_ROUTES`). A layout of one
 * is the document `template:<pageType>`, any other the custom page
 * `page:<pageType>`. Both are part of the hash.
 *
 * Refuses a set that contradicts itself: two blocks of one type, or a
 * block that names as a child a type that is missing or cannot be one.
 */
export function buildBlockCatalogue(
  definitions: readonly BlockDefinition[],
  roots: Partial<Record<BuilderDocumentKind, DocumentRoot>> = BUILDER_DOCUMENT_ROOTS,
  templateKeys: readonly string[] = Object.keys(STATIC_LAYOUT_ROUTES),
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
        ? [[kind, {
            schema: settingsJsonSchema(root.schema),
            translatable: [...root.translatable],
            ...(kind === 'template' && { keys: [...templateKeys].sort() }),
          }]]
        : []
    }),
  )
  const hash = createHash('sha256').update(JSON.stringify({ blocks, documentKinds })).digest('hex').slice(0, 16)
  return { hash, blocks, documentKinds }
}

/**
 * Every block of this build: the `*.block.ts` files of `app/blocks`, which
 * `modules/builder-blocks` hands to the server bundle as the `#builder-blocks`
 * virtual module. The one registry `parseDocument` and the catalogue read.
 */
export const builderBlocks: ReadonlyMap<string, BlockDefinition> = new Map(blockList.map(definition => [definition.type, definition]))

/**
 * The catalogue of this build, and the JSON the endpoint serves. A constant
 * of the server bundle, so there is one answer for every store until the
 * next deploy; built when the server loads, so a contradictory set of
 * definitions stops the boot instead of the first request.
 */
export const builderCatalogueDocument: BuilderCatalogueDocument = (() => {
  const { hash, blocks, documentKinds } = buildBlockCatalogue(blockList)
  return { hash, json: JSON.stringify({ hash, blocks, documentKinds }) }
})()
