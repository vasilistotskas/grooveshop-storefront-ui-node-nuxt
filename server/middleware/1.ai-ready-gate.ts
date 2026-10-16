import { createError, defineEventHandler, getRequestHeader } from 'nuxt/server'

/**
 * Interim multi-tenant gate for nuxt-ai-ready's discovery surfaces.
 *
 * `/llms.txt`, `/llms-full.txt` and the direct `.md` page mirrors
 * (`isAiSurfacePath`) name the store they are served for, since the
 * site config is the store's from the start of each request
 * (`server/plugins/tenant-site-config.ts`). They are still not opened to
 * every store: the module builds `/llms.txt` through a cached function
 * whose key is not the store's host, and lists pages from the sitemap.
 * Until that is settled, these surfaces are served ONLY on the
 * platform's own storefront (`servesAiSurfaces`: the tenant whose
 * ``isPlatformStorefront`` flag is set — resolved here, because these
 * paths sit in 0.tenant's bypass list) and 404 everywhere else,
 * including when no store carries the flag. Other stores do not
 * advertise them in their `Link` header either.
 *
 * Exemptions:
 * - The `x-md-negotiation-internal` re-fetch from
 *   0.markdown-negotiation.ts — that path resolves the tenant properly
 *   and produces a tenant-scoped mirror, so it stays available on
 *   every tenant.
 * - `/api/**` — no AI surface lives there; avoids accidental matches.
 *
 * The module's page database is off (`aiReady.database: false` in
 * nuxt.config.ts), so pages rendered on tenant hosts no longer land in
 * a shared per-pod index.
 */
export default defineEventHandler(async (event) => {
  if (event.req.method !== 'GET') return

  if (!isAiSurfacePath(event.url.pathname)) return
  if (getRequestHeader(event, 'x-md-negotiation-internal')) return

  const host = requestTenantHost(event)
  const result = host ? await getTenantConfig(host) : null
  if (result?.type !== 'ok' || !servesAiSurfaces(result.config)) {
    throw createError({ status: 404, statusText: 'Not Found' })
  }
})
