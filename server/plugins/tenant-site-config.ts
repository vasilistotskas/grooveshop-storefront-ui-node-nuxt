import { H3Event, getRequestHeader, getRequestHost, getRequestURL } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * Above nuxt-site-config's own layers (`runtimeEnv` is priority 0), so the
 * store's values win however the layers were pushed.
 */
const TENANT_SITE_CONFIG_PRIORITY = 10

/**
 * The store's own site config (url, name, description) for every request
 * that builds one, through nuxt-site-config's `site-config:init` hook — the
 * runtime multi-tenancy hook its docs prescribe ("Runtime Multi-Tenancy",
 * Nuxt Site Config v5). The hook runs when the request's site config is
 * first created, whoever asks for it.
 *
 * It replaces a route middleware that pushed the same layer once
 * `0.tenant.ts` had resolved the store. nuxt-ai-ready builds its `Link`
 * header in a handler it puts ahead of every server middleware, and serves
 * `/llms.txt` and the `.md` mirrors on paths `0.tenant.ts` bypasses, so
 * those read the platform's site config: every store's pages advertised
 * `https://platform.grooveshop.space/index.md` and `/llms.txt`, both 401
 * behind basic auth (owner review, 2026-10-16).
 *
 * The store is the one `0.tenant.ts` resolved when it already ran, else the
 * request's Host through the same cached `getTenantConfig`; an unknown host
 * keeps the platform config. The description follows the page's locale,
 * derived as `1.locale.ts` will (`pageLocale`), since this can run first.
 *
 * On a store that does not serve nuxt-ai-ready's surfaces
 * (`servesAiSurfaces`), the `Link` header the module builds from this
 * config loses its links to them as the response ends — the one seam both
 * a 200 and a 304 revalidation pass through (see `edge-cache.ts`).
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('site-config:init', async ({ event, siteConfig }) => {
    // Nitro hands the hook its h3 event; the hook's type promises only
    // `context`, and the store comes from the Host header, never from
    // `getNitroOrigin`, which honours the client's X-Forwarded-Host.
    if (!(event instanceof H3Event)) return
    const tenant = event.context.tenant
      ?? (await getTenantConfig(tenantHostOf(getRequestHost(event)))).config
    if (!tenant?.primaryDomain) return

    const locale = event.context.locale
      ?? pageLocale(getRequestURL(event).pathname, getRequestHeader(event, 'x-language'), tenant)
    const description = localizedStoreDescription(tenant, locale)
    siteConfig.push({
      _context: 'tenant',
      _priority: TENANT_SITE_CONFIG_PRIORITY,
      url: `https://${tenant.primaryDomain}`,
      name: tenant.storeName || tenant.name,
      ...(description ? { description } : {}),
    })

    if (!servesAiSurfaces(tenant)) dropAiSurfaceLinksOnEnd(event)
  })
})

function dropAiSurfaceLinksOnEnd(event: H3Event) {
  const res = event.node?.res
  if (!res) return
  const end = res.end.bind(res) as (...args: unknown[]) => typeof res
  res.end = ((...args: unknown[]) => {
    const link = res.headersSent ? undefined : res.getHeader('link')
    if (typeof link === 'string') {
      const kept = withoutAiSurfaceLinks(link)
      if (kept) res.setHeader('link', kept)
      else res.removeHeader('link')
    }
    return end(...args)
  }) as typeof res.end
}
