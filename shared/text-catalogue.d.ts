/**
 * The text catalogue of this build, extracted by `modules/text-catalogue`
 * and provided to the server bundle as a Nitro virtual module
 * (`server/utils/textCatalogue.ts` is its only importer).
 *
 * Declared in `shared/` because the app's type program also reads
 * `server/utils` (through Nitro's auto-import types), which the
 * server-only `server/handlers/page-renderer.d.ts` does not reach.
 */
declare module '#text-catalogue' {
  // An import type may name a relative path where an import declaration may not.
  const catalogue: import('./types/textCatalogue').TextCatalogue
  export default catalogue
}
