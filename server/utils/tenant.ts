// In-memory cache with 5-minute TTL
const tenantCache = new Map<string, { config: TenantConfig, expiry: number }>()
const TENANT_CACHE_TTL = 5 * 60 * 1000

export async function getTenantConfig(host: string): Promise<TenantConfig | null> {
  // Strip port — TenantDomain stores bare hostnames (e.g. "localhost", not "localhost:3000")
  const domain = host.replace(/:\d+$/, '')

  const cached = tenantCache.get(domain)
  if (cached && cached.expiry > Date.now()) {
    return cached.config
  }

  const config = useRuntimeConfig()
  try {
    const response = await $fetch<TenantConfig>(
      `${config.apiBaseUrl}/tenant/resolve`,
      { query: { domain } },
    )
    tenantCache.set(domain, { config: response, expiry: Date.now() + TENANT_CACHE_TTL })
    return response
  }
  catch {
    return null
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
