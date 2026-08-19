/**
 * Tenant-gate the legacy favicon paths.
 *
 * Browsers request `/favicon.ico` unprompted, and Nitro serves
 * publicAssets BEFORE server middleware — so as long as platform brand
 * files lived at these paths, every tenant's domain answered with the
 * PLATFORM'S bytes and no middleware could intervene (verified live on
 * staging tenant #2). The platform assets therefore moved to
 * `/platform-favicon/**` (immutable static, linked directly from the
 * platform tenant's head), and these brand-bearing paths are now
 * middleware-owned:
 *
 *  - platform tenant, or a host that doesn't resolve (probes, fresh
 *    installs): 302 to the platform asset — same bytes as before.
 *  - branded tenant (faviconUrl set): 302 to its own favicon.
 *  - unbranded tenant: 404 — the browser shows its default document
 *    icon; never another store's brand.
 *
 * These paths sit in 0.tenant's bypass list (fetched speculatively
 * before any page resolves a tenant), so the tenant is resolved here
 * best-effort — same pattern as the sitemap source and the manifest
 * route.
 */

const FAVICON_EXACT: Record<string, string> = {
  '/favicon.ico': '/platform-favicon/favicon.ico',
  '/favicon.png': '/platform-favicon/favicon.png',
  '/logo.svg': '/platform-favicon/logo.svg',
}
const FAVICON_PREFIX = '/favicon/'

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] ?? ''
  const isPrefixed = path.startsWith(FAVICON_PREFIX)
  const platformTarget
    = FAVICON_EXACT[path]
      ?? (isPrefixed
        ? `/platform-favicon/${path.slice(FAVICON_PREFIX.length)}`
        : undefined)
  if (!platformTarget) {
    return
  }

  // Redirects/404s are short-cached (vs the year-long immutable rules
  // on the real static assets) so a favicon change or a later branding
  // upload propagates without waiting out CDN caches.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  const host = getRequestHost(event, { xForwardedHost: false })
  const result = host ? await getTenantConfig(host) : null

  if (!result || result.type !== 'ok' || isPlatformTenantConfig(result.config)) {
    return sendRedirect(event, platformTarget, 302)
  }

  if (result.config.faviconUrl) {
    return sendRedirect(event, result.config.faviconUrl, 302)
  }

  setResponseStatus(event, 404)
  return ''
})
