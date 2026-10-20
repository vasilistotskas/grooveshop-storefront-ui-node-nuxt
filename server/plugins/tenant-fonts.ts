import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * Sends each page only its store's font faces (`server/utils/tenantFontFaces.ts`):
 * the faces of the families its tokens set (`resolveTenantFonts`), with
 * their fallback metric faces. A request without a tenant (the "store not
 * found" page) sets none and keeps none.
 *
 * Runs after `@nuxt/fonts` has pushed its inline `<style>`: Nitro registers
 * a module's server plugins before the scanned `server/plugins/` ones, and
 * runs a hook's callbacks in registration order.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const tenant = event.context.tenant
    const keep = tenant ? tenantFontFamilies(resolveTenantFonts(tenant)) : new Set<string>()
    html.head = keepHeadFontFaces(html.head, keep)
  })
})
