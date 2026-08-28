/**
 * Client-build stand-in for the `zod` package (wired up by the
 * `$client.resolve.alias` entry in `nuxt.config.ts`).
 *
 * Zod 4 JIT-compiles hot validators with `new Function`, probing whether
 * code generation is allowed (`Function("")` in a try/catch) the first
 * time an object schema is CONSTRUCTED — at module evaluation of
 * `shared/openapi/zod.gen.ts` / `shared/schemas/*`. The probe trips an
 * enforced CSP `script-src` eval violation in every browser (DevTools
 * Issues-panel entry, Lighthouse Best Practices hit) even though Zod
 * catches the throw. Our CSP deliberately ships without `unsafe-eval`.
 *
 * A plugin cannot fix this: Rollup hoists the entry chunk's static
 * imports, so chunks containing schema constructions evaluate before ANY
 * plugin module scope — regardless of plugin order (verified against the
 * v3.164.9 production bundle). Aliasing `zod` to this module instead
 * makes the `jitless` config a dependency of every schema module: ES
 * module semantics guarantee this scope runs before each importer's.
 *
 * `zod/v4` re-exports the exact surface of the `zod` main entry (named
 * `z`, star exports, default `z` — see zod/v4/classic/index.js), and the
 * `^zod$` alias regex leaves the wrapper's own `zod/v4` import alone.
 * Server builds are not aliased: SSR runs without CSP eval limits and
 * keeps the JIT fast path.
 */
import { z } from 'zod/v4'

z.config({ jitless: true })

export * from 'zod/v4'
export { z }
export default z
