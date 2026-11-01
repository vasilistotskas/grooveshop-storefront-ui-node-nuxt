/**
 * The page builder's blocks of this build: the `*.block.ts` files of
 * `app/blocks`, collected by `modules/builder-blocks` and provided to the
 * server bundle as a Nitro virtual module (`server/utils/builderCatalogue.ts`
 * is its only importer).
 *
 * Declared in `shared/` for the same reason as `#text-catalogue`: the app's
 * type program also reads `server/utils`.
 */
declare module '#builder-blocks' {
  // An import type may name a relative path where an import declaration may not.
  const blocks: readonly import('./types/builder').BlockDefinition[]
  export default blocks
}
