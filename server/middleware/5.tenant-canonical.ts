/**
 * Tenant-aware canonical-host redirect.
 *
 * Replaces `@nuxtjs/seo`'s `redirectToCanonicalSiteUrl`, which runs as
 * MODULE middleware — before `4.tenant-site-config.ts` pushes the
 * tenant's own URL — so it compared every host against the env-frozen
 * platform `NUXT_SITE_URL` and 301'd every other tenant's storefront
 * onto tenant #1's domain (observed on staging: tenant2 host → 301
 * https://staging.webside.gr). Single-tenant production never exposed
 * it because the only host WAS the site URL.
 *
 * Here the comparison target is the resolved tenant's `primaryDomain`,
 * so each tenant canonicalizes onto itself: alias TenantDomains 301 to
 * that tenant's primary host (kills duplicate-content serving), and
 * primary-host traffic passes through untouched.
 *
 * Scope guards:
 * - Only GET/HEAD — redirecting mutations would drop bodies.
 * - Never `/api/**` — the SPA calls same-origin proxy routes; a
 *   cross-origin 301 would break those fetches instead of fixing SEO.
 * - No tenant context (bypass paths, resolution failure) → no-op;
 *   `0.tenant.ts` already 404s unknown hosts and the robots plugin
 *   no-indexes what remains.
 * - `www.` is stripped earlier by `0.redirects.ts`.
 */
export default defineEventHandler((event) => {
  const tenant = event.context.tenant
  if (!tenant?.primaryDomain) return

  if (event.method !== 'GET' && event.method !== 'HEAD') return
  if (event.path.startsWith('/api/')) return

  const host = getRequestHost(event, { xForwardedHost: false }).replace(
    /:\d+$/,
    '',
  )
  if (host === tenant.primaryDomain) return

  return sendRedirect(
    event,
    `https://${tenant.primaryDomain}${event.path}`,
    301,
  )
})
