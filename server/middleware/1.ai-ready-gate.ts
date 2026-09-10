/**
 * Interim multi-tenant gate for nuxt-ai-ready's discovery surfaces.
 *
 * `/llms.txt`, `/llms-full.txt` and the direct `.md` page mirrors are
 * NOT tenant-safe today: the module stores indexed pages in one
 * per-pod SQLite with no host column and renders headers/canonical
 * origins from the tenant-less site config — so tenant B's `/llms.txt`
 * would announce tenant A's brand and enumerate tenant A's pages.
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
 * CUTOVER NOTE: before a second tenant goes live in production, the
 * module's runtime indexer should also be disabled (or made host-
 * aware) — pages rendered on tenant hosts still land in the shared
 * index; this gate only prevents their cross-tenant EXPOSURE.
 */
export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') return

  const path = event.path
  const isAiSurface
    = path === '/llms.txt'
      || path === '/llms-full.txt'
      || (path.endsWith('.md') && !path.startsWith('/api/'))
  if (!isAiSurface) return
  if (getRequestHeader(event, 'x-md-negotiation-internal')) return

  const host = getRequestHost(event, { xForwardedHost: false })
  const result = host ? await getTenantConfig(host) : null
  if (result?.type !== 'ok' || result.config.isPlatformStorefront !== true) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
})
