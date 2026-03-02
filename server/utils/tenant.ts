export interface TenantConfig {
  schemaName: string
  name: string
  storeName: string
  storeDescription: string
  logoLightUrl: string
  logoDarkUrl: string
  faviconUrl: string
  primaryColor: string
  neutralColor: string
  accentHex: string
  successHex: string
  warningHex: string
  errorHex: string
  infoHex: string
  themePreset: string
  themeMetadata: Record<string, unknown>
  defaultLocale: string
  defaultCurrency: string
  primaryDomain: string
  loyaltyEnabled: boolean
  blogEnabled: boolean
  plan: string
}

// In-memory cache with 5-minute TTL
const tenantCache = new Map<string, { config: TenantConfig, expiry: number }>()
const TENANT_CACHE_TTL = 5 * 60 * 1000

export async function getTenantConfig(host: string): Promise<TenantConfig | null> {
  const cached = tenantCache.get(host)
  if (cached && cached.expiry > Date.now()) {
    return cached.config
  }

  const config = useRuntimeConfig()
  try {
    const response = await $fetch<TenantConfig>(
      `${config.apiBaseUrl}/tenant/resolve`,
      { query: { domain: host } },
    )
    tenantCache.set(host, { config: response, expiry: Date.now() + TENANT_CACHE_TTL })
    return response
  }
  catch {
    return null
  }
}

export function clearTenantCache(host?: string) {
  if (host) {
    tenantCache.delete(host)
  }
  else {
    tenantCache.clear()
  }
}
