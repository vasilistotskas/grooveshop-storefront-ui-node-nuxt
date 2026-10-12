import { createError, defineEventHandler, getRequestHeader } from 'nuxt/server'

/**
 * Interim multi-tenant gate for nuxt-ai-ready's discovery surfaces.
 *
 * `/llms.txt`, `/llms-full.txt` and the direct `.md` page mirrors are
 * NOT tenant-safe today: the module renders headers/canonical origins
 * from the tenant-less site config and lists the platform's pages — so
 * tenant B's `/llms.txt` would announce tenant A's brand and enumerate
 * tenant A's pages.
 * Until the module supports per-host indexes, these surfaces are
 * served ONLY on the platform's own storefront (the tenant whose
 * ``isPlatformStorefront`` flag is set — resolved here, because these
 * paths sit in 0.tenant's bypass list) and 404 everywhere else,
 * including when no store carries the flag: the shared index would
 * otherwise leak cross-tenant.
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

  const path = event.url.pathname
  const isAiSurface
    = path === '/llms.txt'
      || path === '/llms-full.txt'
      || (path.endsWith('.md') && !path.startsWith('/api/'))
  if (!isAiSurface) return
  if (getRequestHeader(event, 'x-md-negotiation-internal')) return

  const host = requestTenantHost(event)
  const result = host ? await getTenantConfig(host) : null
  if (result?.type !== 'ok' || result.config.isPlatformStorefront !== true) {
    throw createError({ status: 404, statusText: 'Not Found' })
  }
})
