import { defineNitroPlugin } from 'nitropack/runtime'
import { getRequestURL } from 'h3'

/**
 * Injects the store's theme into every SSR response as one
 * `<style id="tenant-theme">`: the stylesheet `themeCss` writes from the
 * theme document of the store's current release (`requestStoreTheme`, the
 * same compiler the page editor's preview draws with). Nothing of the
 * stylesheet comes from the Tenant row.
 *
 * It sets everything the theme holds, Nuxt UI's `--ui-primary` and the three
 * colour scales included, so the colours Nuxt UI's own `#nuxt-ui-colors` tag
 * writes from `appConfig.ui.colors` (the platform's palettes, the same on the
 * server and in the browser, so no flash and no hydration mismatch) are
 * overwritten by this block. It is unlayered and pushed last, so it wins over
 * Nuxt UI's `@layer theme` and `main.css`.
 *
 * The render is what Nitro's page cache stores, so this runs on a cache miss
 * only; the read behind it is cached too, and a render that could not read
 * the theme is marked degraded and kept out of every cache
 * (`requestStoreTheme`).
 *
 * Carries the request's CSP nonce when the nonce pipeline stamped one
 * (`server/plugins/csp-nonce.ts`) so the block keeps working if style-src
 * ever drops 'unsafe-inline'.
 *
 * Not on the page editor (`isBuilderEditorPath`): the editor is drawn in the
 * platform's look, and the store is what its preview frame shows.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', async (html, { event }) => {
    if (!event.context.tenant || isBuilderEditorPath(getRequestURL(event).pathname)) return

    const settings = await requestStoreTheme(event)
    const css = themeCss(settings, resolveDesign(event.context.tenant.schemaName))

    const nonce = event.context.cspNonce
    const nonceAttr = typeof nonce === 'string' && nonce
      ? ` nonce="${nonce}"`
      : ''
    html.head.push(`<style id="tenant-theme"${nonceAttr}>${css}</style>`)
  })
})
