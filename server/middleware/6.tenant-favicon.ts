/**
 * Tenant-gate the platform's static icon files.
 *
 * `/favicon.ico`, `/favicon.png`, `/logo.svg`, and `/favicon/**` are
 * publicAssets baked into the shared build — without this middleware
 * every tenant's domain served the PLATFORM'S brand bytes (browsers
 * request `/favicon.ico` unprompted even when the page renders no icon
 * links, so head-link gating alone cannot stop the leak).
 *
 * Policy per requesting host:
 *  - platform tenant (or unresolvable host — probes, fresh installs):
 *    fall through to the static file, byte-identical to today.
 *  - branded tenant (faviconUrl set): 302 to its own favicon.
 *  - unbranded tenant: 404 — the browser shows its default document
 *    icon; never another store's brand.
 *
 * These paths sit in 0.tenant's bypass list (they are fetched
 * speculatively before any page resolves a tenant), so the tenant is
 * resolved here best-effort — same pattern as the sitemap source and
 * the manifest route.
 */

const FAVICON_EXACT = new Set(['/favicon.ico', '/favicon.png', '/logo.svg'])
const FAVICON_PREFIX = '/favicon/'

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] ?? ''
  if (!FAVICON_EXACT.has(path) && !path.startsWith(FAVICON_PREFIX)) {
    return
  }

  const host = getRequestHost(event, { xForwardedHost: false })
  if (!host) return

  const result = await getTenantConfig(host)
  if (result.type !== 'ok') return

  const tenant = result.config
  if (isPlatformTenantConfig(tenant)) return

  // The routeRules give these paths year-long immutable caching (right
  // for the platform's static bytes, wrong for tenant answers): a
  // year-cached 302/404 would outlive a favicon change or a later
  // branding upload. One hour keeps CDN/browser churn low without
  // freezing the tenant's branding state.
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  if (tenant.faviconUrl) {
    return sendRedirect(event, tenant.faviconUrl, 302)
  }

  setResponseStatus(event, 404)
  return ''
})
