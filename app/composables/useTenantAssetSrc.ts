import { hasProtocol } from 'ufo'

/**
 * Relativize same-origin absolute asset URLs.
 *
 * Tenant rows store absolute URLs (Django URLField), but an absolute
 * ``src`` makes @nuxt/image skip IPX entirely — the tenant logo
 * (161 KB PNG) and gallery banner (602 KB JPEG) shipped unoptimized,
 * with no WebP/AVIF and no responsive variants (718 KiB of Lighthouse
 * savings on the tenant #2 homepage). Stripping the tenant's own
 * origin turns them back into public-dir paths IPX can process; any
 * other origin (assetsDomain, external) passes through untouched.
 */
export function useTenantAssetSrc() {
  const tenantStore = useTenantStore()
  const requestUrl = useRequestURL()

  const relativize = (src: string): string => {
    if (!src || !hasProtocol(src)) return src
    try {
      const url = new URL(src)
      const ownHosts = new Set(
        [tenantStore.primaryDomain, requestUrl.host].filter(Boolean),
      )
      if (ownHosts.has(url.host)) {
        return url.pathname + url.search
      }
    }
    catch {
      // Malformed URL — leave it for the provider to handle.
    }
    return src
  }

  return { relativize }
}
