// In-memory cache with 5-minute TTL.
//
// Negative results (404 / 5xx) are explicitly NOT cached, so adversarial
// Host headers can't accumulate entries. A real tenant onboarding event
// is rare on the timescale of cache TTL, so capping at MAX_ENTRIES with
// a simple FIFO eviction is enough — anything fancier (LRU library)
// adds runtime weight for no real-world payoff. Sweep on every set
// keeps stale entries out without a setInterval (which leaks under
// Nitro HMR / test isolation). See H17 in MULTI_TENANT_AUDIT.md.
const TENANT_CACHE_TTL = 5 * 60 * 1000
const TENANT_CACHE_MAX_ENTRIES = 1000
const tenantCache = new Map<string, { config: TenantConfig, expiry: number }>()

function rememberTenant(domain: string, config: TenantConfig) {
  const now = Date.now()
  // Drop expired entries opportunistically — bounds the map without a
  // background timer.
  for (const [key, entry] of tenantCache) {
    if (entry.expiry <= now) tenantCache.delete(key)
  }
  // Hard cap: if we're still above the limit, evict the oldest entry
  // (Map preserves insertion order so `.keys().next()` is the earliest).
  while (tenantCache.size >= TENANT_CACHE_MAX_ENTRIES) {
    const oldest = tenantCache.keys().next().value
    if (oldest === undefined) break
    tenantCache.delete(oldest)
  }
  tenantCache.set(domain, { config, expiry: now + TENANT_CACHE_TTL })
}

/**
 * Discriminated-union result so callers can distinguish:
 *  - { type: 'ok', config }        — resolved successfully
 *  - { type: 'not_found', config: null } — Django returned 404 (unknown domain)
 *  - { type: 'error_5xx', config: null } — Django returned 5xx (transient, do NOT cache)
 */
type TenantResult
  = | { type: 'ok', config: TenantConfig }
    | { type: 'not_found', config: null }
    | { type: 'error_5xx', config: null }

export async function getTenantConfig(host: string): Promise<TenantResult> {
  // Strip port — TenantDomain stores bare hostnames (e.g. "localhost", not "localhost:3000")
  const domain = host.replace(/:\d+$/, '')

  const cached = tenantCache.get(domain)
  if (cached && cached.expiry > Date.now()) {
    return { type: 'ok', config: cached.config }
  }

  const config = useRuntimeConfig()
  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/tenant/resolve`,
      { query: { domain } },
    )

    // Runtime-validate the response shape with the generated Zod schema.
    // An unrecognised payload is treated as a misconfigured tenant — we
    // log a warning and fall through to not_found rather than serving
    // partial/corrupt data.
    let tenantConfig: TenantConfig
    try {
      // Cast: @hey-api/openapi-ts's zod plugin marks OpenAPI `readOnly`
      // array properties (e.g. allowedCspSources) as `.readonly()`, so
      // zTenantConfig infers `readonly string[]`; the typescript plugin
      // instead marks the *property* readonly and keeps the array itself
      // mutable (`Array<string>`). The two generated artifacts disagree
      // structurally on this one point — the value is identical at
      // runtime, so the cast is safe.
      tenantConfig = await parseDataAs(response, zTenantConfig) as TenantConfig
    }
    catch (parseError) {
      log.warn({ tag: 'tenant', message: 'getTenantConfig: response failed Zod validation', domain, parseError })
      return { type: 'not_found', config: null }
    }

    rememberTenant(domain, tenantConfig)
    return { type: 'ok', config: tenantConfig }
  }
  catch (err: unknown) {
    // Only an explicit 404 means "this domain is not a store". Every
    // other failure is transient and must be reported as such.
    //
    // ofetch wraps HTTP errors as FetchError with a `.status` field, but
    // a network-level failure — connect timeout, ECONNREFUSED, DNS,
    // Django restarting — carries NO status at all. That used to fall
    // through to `not_found`, so the middleware answered a hard 404
    // "Store not found" and the shop looked deleted for the duration of
    // a blip. Observed in production 2026-08-21: a reload of
    // /account/settings surfaced "Παρουσιάστηκε σφάλμα" because
    // /api/regions 404'd this way while Django was perfectly healthy
    // seconds later.
    //
    // Negative results are never cached either way — once the Tenant row
    // exists in Django, the very next request must resolve.
    const status = (err as { status?: number })?.status ?? 0
    if (status === 404) {
      // Log the host, because nothing else does. Django answers this from
      // the PUBLIC schema — no tenant resolved, so its own request log
      // reads `schema=public domain=-` with the Host nowhere in it, and
      // the 2026-09-08 audit found ~300 of these a day that could not be
      // told apart: a bot sending an arbitrary Host, or a real store
      // whose `TenantDomain` row was never added. `warn`, not `error` —
      // refusing an unknown host is this function working correctly, and
      // negative results are deliberately never cached, so every probe
      // re-asks.
      log.warn({
        tag: 'tenant',
        message: 'getTenantConfig: no store is registered for this host',
        domain,
      })
      return { type: 'not_found', config: null }
    }
    log.warn({
      tag: 'tenant',
      message: 'getTenantConfig: transient backend failure, not caching',
      domain,
      status: status || 'network-error',
    })
    return { type: 'error_5xx', config: null }
  }
}

export function clearTenantCache(host?: string) {
  if (host) {
    const domain = host.replace(/:\d+$/, '')
    tenantCache.delete(domain)
  }
  else {
    tenantCache.clear()
  }
}

/**
 * Whether *tenant* IS the platform's own storefront (server-side twin
 * of `useIsPlatformTenant`). Designated by the PRIVATE
 * ``runtimeConfig.platformTenant.host`` — see
 * ``shared/utils/platformTenant.ts`` for the rule and its edge cases.
 */
export function isPlatformTenantConfig(
  tenant: { primaryDomain?: string } | null | undefined,
): boolean {
  return isPlatformTenantHost(
    tenant?.primaryDomain,
    useRuntimeConfig().platformTenant?.host,
  )
}
