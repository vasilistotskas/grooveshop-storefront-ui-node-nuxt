/**
 * Zod 4 JIT-compiles hot validators with `new Function` after probing
 * whether code generation is allowed (`Function("")` in a try/catch).
 * The probe itself trips an enforced CSP `script-src` eval violation in
 * every browser — a DevTools Issues-panel entry that costs Lighthouse
 * Best Practices points — even though Zod catches the throw and falls
 * back to interpretation. Our CSP deliberately ships without
 * `unsafe-eval`, so pin Zod to its interpreted path before any schema
 * parses. Client-only: SSR runs without CSP eval limits and keeps JIT.
 */
import { z } from 'zod'

export default defineNuxtPlugin({
  name: 'zod-jitless',
  enforce: 'pre',
  setup() {
    z.config({ jitless: true })
  },
})
