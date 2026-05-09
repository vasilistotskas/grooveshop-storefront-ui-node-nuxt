// In-memory cache with 5-minute TTL
const tenantCache = new Map<string, { config: TenantConfig, expiry: number }>()
const TENANT_CACHE_TTL = 5 * 60 * 1000

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
      tenantConfig = await parseDataAs(response, zTenantConfig)
    }
    catch (parseError) {
      log.warn('tenant', 'getTenantConfig: response failed Zod validation', { domain, parseError })
      return { type: 'not_found', config: null }
    }

    tenantCache.set(domain, { config: tenantConfig, expiry: Date.now() + TENANT_CACHE_TTL })
    return { type: 'ok', config: tenantConfig }
  }
  catch (err: unknown) {
    // Distinguish Django 5xx (transient) from 404 (unknown domain).
    // ofetch wraps HTTP errors as FetchError with a `.status` field.
    const status = (err as { status?: number })?.status ?? 0
    if (status >= 500) {
      // Do NOT cache — we want every subsequent request to retry so
      // the store recovers automatically once Django is healthy again.
      log.warn('tenant', 'getTenantConfig: backend returned 5xx, not caching', { domain, status })
      return { type: 'error_5xx', config: null }
    }
    // 404 or network-level error (treated as unknown domain).
    // Also do NOT cache negative results — once the Tenant row is
    // created in Django, the very next request must resolve.
    return { type: 'not_found', config: null }
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
