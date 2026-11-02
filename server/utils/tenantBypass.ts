import { getRequestHeader } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/**
 * The paths `server/middleware/0.tenant.ts` lets through without resolving
 * the store. The one list: the middleware and every plugin that would
 * otherwise look the store up on its own consult it.
 *
 * Rule: any path that either (a) does not need tenant context to serve
 * a valid response, or (b) is hit by infrastructure that never sends a
 * real Host header, must be listed here. Missing entries will result in
 * a 404 "Store not found" for legitimate requests.
 *
 * Every entry has a route or file behind it; a path nothing serves does not
 * belong here, since it would let any Host reach a full error render instead
 * of the middleware's plain "Store not found".
 *
 * Two kinds, because a plugin must treat them differently:
 *
 * - TENANT_FREE: nothing on the path depends on a store. No store is
 *   looked up for it, by anyone.
 * - SELF_RESOLVING: the path bypasses the middleware but its own handler
 *   needs the store (a favicon redirect, the manifest, a sitemap, the
 *   store's own `.md` mirror) and resolves it, through
 *   `requestTenantResult`.
 */
const TENANT_FREE_PREFIXES: readonly string[] = [
  // Nuxt chunk / HMR assets — internal bundler paths, no tenant context needed.
  '/_nuxt',
  // IPX on-the-fly image processing — served from public file system, no tenant.
  '/_ipx',
  // Platform brand statics — immutable files, only ever linked from the
  // platform tenant's own head; no tenant context needed.
  '/platform-favicon',
] as const

const TENANT_FREE_EXACT: readonly string[] = [
  // K8s liveness / readiness probe on the frontend deployment (frontend.yaml) — hit with
  // the pod cluster IP as Host, not a real tenant domain. Without this the
  // liveness probe 404s and the pod restart-loops.
  '/api/_alive',
  // Shallow Nuxt-only health route (server/routes/_health.get.ts) — may be polled by infra without a tenant Host header.
  '/_health',
  // Django's CacheService calls this over internal cluster DNS
  // (frontend-nuxt-service) with no tenant Host, so tenant resolution
  // would 404 "Store not found" before the endpoint's own shared-secret
  // token check ever ran — silently killing cross-service SSR cache
  // invalidation. The handler needs no tenant context (it operates on
  // the shared Nitro cache and scopes by the payload's `host`).
  '/api/admin/cache/purge',
  // The text catalogue (every editable text of this build, with its
  // defaults and placeholders) and the check of a store-written text
  // against it. Django's text editor calls both server to server, with no
  // tenant Host; neither needs one. The platform's defaults are the same
  // for every store and already ship to every browser, and the check reads
  // only the request body and that catalogue.
  '/api/texts/catalogue',
  '/api/texts/validate',
  // The page builder's block catalogue: the settings schema of every block
  // of this build. Django validates every save of a builder document
  // against it, calling server to server with no tenant Host; like the
  // text catalogue it is a constant of the server bundle.
  '/api/builder/catalogue',
] as const

const SELF_RESOLVING_PREFIXES: readonly string[] = [
  // Dynamic sitemap source — hit by @nuxtjs/sitemap at build/SWR time
  // without a real tenant Host header. The handler itself opts in to
  // ``tenantCacheKey`` so per-tenant sitemaps still partition correctly
  // when the request DOES carry a tenant; the bypass keeps build-time
  // and probe-time hits from 404'ing (M3 in MULTI_TENANT_AUDIT.md).
  '/api/__sitemap__',
  // Legacy favicon paths — owned by 6.tenant-favicon.ts, which resolves
  // the tenant itself (so unknown-host probes fall back to the platform
  // asset instead of 404ing here first).
  '/favicon/',
] as const

const SELF_RESOLVING_EXACT: readonly string[] = [
  // Favicon — browser requests this speculatively before the page resolves
  // a tenant (6.tenant-favicon.ts resolves it).
  '/favicon.ico',
  '/favicon.png',
  '/logo.svg',
  // Robots.txt — crawlers and monitoring probes fetch this without a tenant
  // subdomain (the robots plugin resolves the store).
  '/robots.txt',
  // PWA web manifest — fetched by the browser independently of page navigation.
  '/manifest.webmanifest',
  // nuxt-ai-ready discoverability endpoints — hit by crawlers / LLMs
  // before they know which tenant a path belongs to (M3 in
  // MULTI_TENANT_AUDIT.md). 1.ai-ready-gate.ts resolves the store;
  // tenant-specific content lives at ``<route>.md``, bypassed by suffix
  // below.
  '/llms.txt',
  '/llms-full.txt',
] as const

// nuxt-ai-ready emits a content-negotiated ``.md`` mirror for every
// page. Crawlers fetch these directly from the bare hostname without
// a tenant Host header, so suffix-bypass them too. Bypassed only on
// GET — POST/PUT/etc. on a ``.md`` path is not a legitimate caller.
const SELF_RESOLVING_SUFFIXES: readonly string[] = ['.md'] as const

const startsWithAny = (path: string, prefixes: readonly string[]) =>
  prefixes.some(prefix => path.startsWith(prefix))

/**
 * Whether nothing on `path` depends on a store: probes, assets, the
 * server-to-server endpoints. Nobody looks a store up for these — not the
 * tenant middleware, not a plugin that runs for every request.
 */
export function isTenantFreePath(path: string): boolean {
  return startsWithAny(path, TENANT_FREE_PREFIXES) || TENANT_FREE_EXACT.includes(path)
}

/**
 * Whether `0.tenant.ts` skips resolution for this request: a tenant-free
 * path, or one whose handler resolves the store itself.
 *
 * The `.md` suffix is exempt for requests carrying the
 * `x-md-negotiation-internal` marker set by
 * server/middleware/0.markdown-negotiation.ts's internal re-fetch — that
 * fetch forwards the ORIGINAL request's real Host header, so resolving
 * tenant context there produces a tenant-scoped .md mirror instead of
 * always falling through to public-schema content. The bypass is for
 * GENUINE external crawler hits, which land on the bare `.md` URL with no
 * meaningful tenant Host.
 */
export function bypassesTenantMiddleware(event: RequestEvent): boolean {
  const path = event.url.pathname
  if (isTenantFreePath(path)) return true
  if (startsWithAny(path, SELF_RESOLVING_PREFIXES) || SELF_RESOLVING_EXACT.includes(path)) return true
  return event.req.method === 'GET'
    && SELF_RESOLVING_SUFFIXES.some(suffix => path.endsWith(suffix))
    && !getRequestHeader(event, 'x-md-negotiation-internal')
}
