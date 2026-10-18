import { useStorage } from 'nitropack/runtime'
import { useRuntimeConfig } from 'nuxt/server'

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

// The resolve payload carries `features`, and a feature flip must not wait
// out the TTL. Every storefront pod keeps its own copy, and Django's
// purge (`/api/admin/cache/purge`) reaches ONE pod, so the purge writes an
// EPOCH to the shared cache storage (`invalidateTenantConfigs`): one per
// store, plus one for a platform-wide purge. Each pod re-reads a store's
// epochs at most every EPOCH_CHECK_MS (one read per pod per store per
// window, never one per request) and drops that store's copy when they
// moved.
//
// The epoch a pod holds is also part of every cache key built from the
// tenant config (`tenantCacheKey`, and the `x-tenant-epoch` header the
// route-rule page cache varies on). A pod that has not seen a new epoch
// yet renders from the old features and files the result under the OLD
// epoch, which no updated pod reads; once a pod sees the new one it reads
// and writes under that. Entries of an old epoch are never read again and
// leave on their own TTL.
const TENANT_EPOCH_KEY = 'tenant-config-epoch'
const EPOCH_CHECK_MS = 5000
const NO_EPOCH = '0.0'
const epochs = new Map<string, { value: string, checkedAt: number }>()

const epochKeyOf = (domain: string) => `${TENANT_EPOCH_KEY}:${domain}`
const PLATFORM_EPOCH_KEY = `${TENANT_EPOCH_KEY}:*`

/** Re-read `domain`'s epoch when the window is up, and drop its copy when it moved. */
async function syncEpoch(domain: string) {
  const now = Date.now()
  const known = epochs.get(domain)
  if (known && now - known.checkedAt < EPOCH_CHECK_MS) return
  // Claim the window first: concurrent requests keep the held value.
  epochs.set(domain, { value: known?.value ?? NO_EPOCH, checkedAt: now })
  try {
    const storage = useStorage('cache')
    const [platform, store] = await Promise.all([
      storage.getItem<string>(PLATFORM_EPOCH_KEY),
      storage.getItem<string>(epochKeyOf(domain)),
    ])
    const value = `${platform ?? 0}.${store ?? 0}`
    epochs.set(domain, { value, checkedAt: now })
    if (known && known.value !== value) tenantCache.delete(domain)
  }
  catch (error) {
    // The shared storage is down: keep serving the copy the TTL bounds.
    log.warn({
      tag: 'tenant',
      message: 'tenant epoch unreadable, keeping the cached configs',
      domain,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * The epoch this pod holds for the store `host` names, for the cache keys
 * of everything rendered from its tenant config. Read from memory: the
 * tenant middleware has synced it before any handler or cache key runs.
 */
export function tenantConfigEpoch(host: string): string {
  return epochs.get(tenantHostOf(host))?.value ?? NO_EPOCH
}

/**
 * Every pod drops the cached tenant config of `host` (every store when
 * omitted) within EPOCH_CHECK_MS, and keys what it renders next under a
 * new epoch. Called by the cache purge endpoint BEFORE it evicts rendered
 * pages, so a page re-rendered after the purge reads the new features.
 */
export async function invalidateTenantConfigs(host?: string) {
  const domain = host ? tenantHostOf(host) : undefined
  clearTenantCache(domain)
  await useStorage('cache').setItem(domain ? epochKeyOf(domain) : PLATFORM_EPOCH_KEY, `${Date.now()}`)
}

function rememberTenant(domain: string, config: TenantConfig) {
  const now = Date.now()
  // Drop expired entries opportunistically — bounds the map without a
  // background timer.
  for (const [key, entry] of tenantCache) {
    if (entry.expiry <= now) {
      tenantCache.delete(key)
      epochs.delete(key)
    }
  }
  // Hard cap: if we're still above the limit, evict the oldest entry
  // (Map preserves insertion order so `.keys().next()` is the earliest).
  while (tenantCache.size >= TENANT_CACHE_MAX_ENTRIES) {
    const oldest = tenantCache.keys().next().value
    if (oldest === undefined) break
    tenantCache.delete(oldest)
    epochs.delete(oldest)
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
  const domain = tenantHostOf(host)
  if (tenantCache.has(domain)) await syncEpoch(domain)

  const cached = tenantCache.get(domain)
  if (cached && cached.expiry > Date.now()) {
    return { type: 'ok', config: cached.config }
  }

  const config = useRuntimeConfig()
  try {
    const response = await backendFetchFor({ tenantHost: domain })(
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
    await syncEpoch(domain)
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
    tenantCache.delete(tenantHostOf(host))
    epochs.delete(tenantHostOf(host))
  }
  else {
    tenantCache.clear()
    epochs.clear()
  }
}

/**
 * Whether *tenant* IS the platform's own storefront (server-side twin
 * of `useIsPlatformTenant`): the ``Tenant.is_platform_storefront`` row
 * flag from the resolve payload — never a hostname comparison, and no
 * env value names a store. An absent tenant or unset primaryDomain
 * (probes, prerender, unknown hosts) counts as platform so those
 * surfaces keep the bundled brand.
 */
export function isPlatformTenantConfig(
  tenant:
    | { primaryDomain?: string, isPlatformStorefront?: boolean }
    | null
    | undefined,
): boolean {
  if (!tenant?.primaryDomain) return true
  return tenant.isPlatformStorefront === true
}
