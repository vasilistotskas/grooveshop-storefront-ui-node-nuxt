import { buildTenantThemeCss } from '../utils/themeTokens'

/**
 * Injects the per-tenant design-token stylesheet into every SSR
 * response. The values come from the pure compiler in
 * ``server/utils/themeTokens.ts`` (preset ⊕ Tenant fields ⊕ sanitized
 * theme_metadata — see its sanitization contract).
 *
 * Nuxt UI's own ``#nuxt-ui-colors`` tag (rendered from the per-request
 * ``appConfig.ui.colors`` set by ``app/plugins/tenant-theme.ts``) lives
 * in ``@layer theme``; this block is unlayered and pushed last, so it
 * wins over both Nuxt UI defaults and ``main.css`` platform values.
 *
 * Carries the request's CSP nonce when the nonce pipeline stamped one
 * (``server/plugins/csp-nonce.ts``) so the block keeps working if
 * style-src ever drops 'unsafe-inline'.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const tenant = event.context.tenant
    if (!tenant) return

    const { css, metadataError } = buildTenantThemeCss(tenant)
    if (metadataError) {
      log.warn({
        tag: 'tenant-theme',
        message: 'invalid theme_metadata — preset values used instead',
        schema: tenant.schemaName,
        metadataError,
      })
    }
    if (!css) return

    const nonce = event.context.cspNonce
    const nonceAttr = typeof nonce === 'string' && nonce
      ? ` nonce="${nonce}"`
      : ''
    html.head.push(`<style id="tenant-theme"${nonceAttr}>${css}</style>`)
  })
})
