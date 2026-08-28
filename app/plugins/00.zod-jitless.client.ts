/**
 * Zod 4 JIT-compiles hot validators with `new Function`, probing whether
 * code generation is allowed (`Function("")` in a try/catch) the first
 * time an object schema is CONSTRUCTED — i.e. at module evaluation of
 * `shared/openapi/zod.gen.ts` and `shared/schemas/*`, not at parse time.
 * The probe trips an enforced CSP `script-src` eval violation in every
 * browser (DevTools Issues-panel entry, Lighthouse Best Practices hit)
 * even though Zod catches the throw. Our CSP deliberately ships without
 * `unsafe-eval`, so pin Zod to its interpreted path.
 *
 * Ordering is load-bearing twice over:
 *  - `z.config` is called at MODULE scope — plugin `setup()` runs only
 *    after every module in the graph has evaluated, which is too late.
 *  - The `00.` filename prefix makes this the first plugin module the
 *    generated plugins index imports, ahead of `auth.ts` whose store
 *    imports construct the first schemas.
 *
 * Client-only: SSR runs without CSP eval limits and keeps JIT.
 */
import { z } from 'zod'

z.config({ jitless: true })

export default defineNuxtPlugin({
  name: 'zod-jitless',
  enforce: 'pre',
  setup() {},
})
