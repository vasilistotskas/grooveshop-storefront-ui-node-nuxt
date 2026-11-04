/**
 * How the client build groups modules into files, read by the
 * `output.codeSplitting` groups in `nuxt.config.ts`.
 *
 * Automatic splitting makes one file per distinct set of lazy chunks that
 * reach a module, whatever its size, and the storefront has hundreds of lazy
 * chunks: 296 of 755 client files were under 1 KB and a product page loaded
 * 147 of them (2026-11-04). The groups below took that page to 73, every
 * page's JS down 6-7%, and finished hydration 8-12% sooner on a throttled
 * phone. First paint did not move.
 *
 * Measure a change here on real pages, in every design, from the browser:
 * `nuxt analyze` and the bundle analyzers stop at a page's thin shell and
 * report the same size for every route.
 */

/** The chunk of the lazy modules that most pages need. */
export const SHARED_CHUNK_NAME = 'lazy-shared'

/** The chunk of what a route resolves before its body can start loading. */
export const ROUTE_BOOT_CHUNK_NAME = 'route-boot'

/**
 * How many lazy chunks must reach a module for it to go in the shared chunk.
 * A library few pages use stays out by this rule alone, with no list of
 * heavy packages to maintain. Measured on the module graph (2026-11-04): the
 * lowest value at which no page loads more bytes than without the chunk; 20
 * added 8 KB to the home page, 50 kept 28% more files.
 */
export const SHARED_CHUNK_MIN_ENTRIES = 30

/**
 * A module this large stays a file of its own, loading alongside the others
 * rather than behind them: the icon bundle and the generated Zod schemas.
 */
export const SHARED_CHUNK_MAX_MODULE_BYTES = 32 * 1024

/**
 * Every visitor downloads these two chunks, so the build fails rather than
 * let one grow unnoticed. A page that stops being a thin shell pulls whatever
 * it statically imports into `route-boot`: the page editor once took it to
 * 1.3 MB. Over budget means find what moved in, not raise the number.
 */
export const CLIENT_CHUNK_BUDGET_BYTES: Readonly<Record<string, number>> = {
  [ROUTE_BOOT_CHUNK_NAME]: 48 * 1024,
  [SHARED_CHUNK_NAME]: 512 * 1024,
}

/**
 * Stylesheets, preprocessor sources and Vue SFC `<style>` virtuals. Never
 * capture one in a group: folding it into a named JS chunk makes Nuxt emit
 * that chunk's CSS as a render-blocking `<link>` on every page (this once
 * shipped the map library's stylesheet site-wide) and disturbs Vite's CSS
 * emit order.
 */
export function isStyleModuleId(id: string): boolean {
  return /\.(?:css|scss|sass|less|styl|pcss)(?:\?|$)/.test(id)
    || id.includes('type=style')
}

/**
 * The route shells, the named middleware, `i18n.config` and the two layouts
 * nearly every page uses. Each is a lazy import of a few hundred bytes, and
 * a first render awaits them one after another: three round trips for under
 * 1 KB, with the connection idle, before the page body could even start.
 *
 * A chunk's static imports load for everyone, so this list holds only what
 * stays cheap: `_builder*` are not shells (the editor, and a preview that
 * renders its own UI) and `auth-split` statically reaches 230 KB.
 */
const ROUTE_BOOT_SOURCE = /[\\/]app[\\/](?:pages[\\/](?!_builder)|middleware[\\/]|layouts[\\/](?:default|checkout)\.vue)|[\\/]i18n[\\/]i18n\.config\./

/**
 * Whether `id` belongs in the route-boot chunk. `node_modules` is excluded
 * by name because Nuxt ships a `dist/app/middleware/`, and the Docker build
 * runs under `/app`, so the path alone cannot tell them apart.
 */
export function isRouteBootModule(id: string): boolean {
  return !id.includes('node_modules')
    && !isStyleModuleId(id)
    && ROUTE_BOOT_SOURCE.test(id)
}
