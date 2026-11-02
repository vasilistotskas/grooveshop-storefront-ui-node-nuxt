/**
 * The block definitions of this build, for the page editor in the browser:
 * the same `app/blocks/**\/*.block.ts` files the server's catalogue is made
 * of (`modules/builder-blocks`), keyed by type.
 *
 * Imported by the editor alone: the definitions carry their Zod schemas,
 * which have no place in the storefront's public pages.
 */
const modules = import.meta.glob<{ default: BlockDefinition }>('~/blocks/**/*.block.ts', { eager: true })

export const builderEditorBlocks: ReadonlyMap<string, BlockDefinition> = new Map(
  Object.values(modules).map(({ default: definition }) => [definition.type, definition]),
)
