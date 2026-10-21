/**
 * Nuxt's page renderer (`@nuxt/nitro-server`'s `runtime/handlers/renderer`),
 * re-exported by a virtual module in `nuxt.config.ts` (`nitro:config`) for
 * `custom-page.ts`. The
 * package ships it as plain `.mjs` without declarations.
 */
declare module '#page-renderer' {
  import type { EventHandler } from 'h3'

  const renderer: EventHandler
  export default renderer
}
