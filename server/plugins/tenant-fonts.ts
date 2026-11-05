import { defineNitroPlugin } from 'nitropack/runtime'
import { getRequestURL } from 'h3'

/**
 * Sends each page only its store's font faces (`server/utils/tenantFontFaces.ts`):
 * the faces of the families its theme sets (`requestStoreTheme`, the same
 * read the stylesheet is compiled from), with their fallback metric faces. A
 * request without a tenant (the "store not found" page) sets none and keeps
 * none, and neither does the page editor (`isBuilderEditorPath`), which is
 * drawn in the platform's look.
 *
 * Runs after `@nuxt/fonts` has pushed its inline `<style>`: Nitro registers
 * a module's server plugins before the scanned `server/plugins/` ones, and
 * runs a hook's callbacks in registration order.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', async (html, { event }) => {
    const keep = event.context.tenant && !isBuilderEditorPath(getRequestURL(event).pathname)
      ? tenantFontFamilies((await requestStoreTheme(event)).fonts)
      : new Set<string>()
    html.head = keepHeadFontFaces(html.head, keep)
  })
})
