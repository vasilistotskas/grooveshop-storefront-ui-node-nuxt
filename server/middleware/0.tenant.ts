/**
 * Paths that must bypass tenant resolution. Each entry is explained below.
 *
 * Rule: any path that either (a) does not need tenant context to serve
 * a valid response, or (b) is hit by infrastructure that never sends a
 * real Host header, must be listed here. Missing entries will result in
 * a 404 "Store not found" for legitimate requests.
 */
const BYPASS_PREFIXES: readonly string[] = [
  // Nuxt chunk / HMR assets — internal bundler paths, no tenant context needed.
  '/_nuxt',
  // IPX on-the-fly image processing — served from public file system, no tenant.
  '/_ipx',
  // Static assets folder — served verbatim, no tenant.
  '/assets',
  // K8s liveness / readiness probes — hit with pod cluster IP as Host, not a real domain.
  '/api/health',
  // Dynamic sitemap source — hit by @nuxtjs/sitemap at build/SWR time
  // without a real tenant Host header. The handler itself opts in to
  // ``tenantCacheKey`` so per-tenant sitemaps still partition correctly
  // when the request DOES carry a tenant; the bypass keeps build-time
  // and probe-time hits from 404'ing (M3 in MULTI_TENANT_AUDIT.md).
  '/api/__sitemap__',
] as const

const BYPASS_EXACT: readonly string[] = [
  // Root-level K8s probe (e.g. `/health` used by some ingress configs).
  '/health',
  // Favicon — browser requests this speculatively before the page resolves a tenant.
  '/favicon.ico',
  '/favicon.png',
  '/logo.svg',
  // Robots.txt — crawlers and monitoring probes fetch this without a tenant subdomain.
  '/robots.txt',
  // PWA web manifest — fetched by the browser independently of page navigation.
  '/manifest.webmanifest',
  // OpenAPI schema endpoint — used by tooling / CI, not a browser user flow.
  '/openapi',
  // Nuxt health convention — may be polled by infra without a tenant Host header.
  '/_health',
  // nuxt-ai-ready discoverability endpoints — hit by crawlers / LLMs
  // before they know which tenant a path belongs to (M3 in
  // MULTI_TENANT_AUDIT.md). The handler returns the same content
  // regardless of tenant; tenant-specific content lives at
  // ``<route>.md`` which is bypassed by suffix below.
  '/llms.txt',
  '/llms-full.txt',
] as const

// nuxt-ai-ready emits a content-negotiated ``.md`` mirror for every
// page. Crawlers fetch these directly from the bare hostname without
// a tenant Host header, so suffix-bypass them too. Bypassed only on
// GET — POST/PUT/etc. on a ``.md`` path is not a legitimate caller.
const BYPASS_SUFFIXES: readonly string[] = ['.md'] as const

export default defineEventHandler(async (event) => {
  const path = event.path

  // Prefix bypass check (O(n) but n is small and constant)
  if (BYPASS_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return
  }

  // Exact bypass check
  if (BYPASS_EXACT.includes(path)) {
    return
  }

  // Suffix bypass — `.md` mirrors emitted by nuxt-ai-ready (M3).
  if (
    event.method === 'GET'
    && BYPASS_SUFFIXES.some(suffix => path.endsWith(suffix))
  ) {
    return
  }

  // Skip tenant resolution during build-time prerendering (no real host available)
  if (getRequestHeader(event, 'x-nitro-prerender')) {
    return
  }

  const host = getRequestHost(event, { xForwardedHost: false })
  const result = await getTenantConfig(host)

  if (result.type === 'error_5xx') {
    // Backend is temporarily unavailable — don't cache; respond 503 so the
    // client retries rather than getting a misleading 404.
    throw createError({ statusCode: 503, statusMessage: 'Service Unavailable' })
  }

  if (!result.config) {
    throw createError({ statusCode: 404, statusMessage: 'Store not found' })
  }

  event.context.tenant = result.config
})
