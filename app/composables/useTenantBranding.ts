/**
 * Single home for tenant branding fallback chains — the meta/og
 * consumers (`useSeoMeta`, manifest, error page) and `<TenantLogo>`
 * both resolve through here so the chain never forks.
 *
 * Light logo:  tenant → platform navbar asset (PLATFORM TENANT ONLY —
 *              an unbranded tenant must never wear another store's
 *              wordmark; `<TenantLogo>` renders the store name as a
 *              text wordmark instead)
 * Dark logo:   tenant dark → tenant light → light fallback chain
 *              (the platform never had a dark navbar variant — dark
 *              mode always rendered the same asset, and webside must
 *              stay pixel-identical; only tenants that SET a dark logo
 *              get one)
 * Favicon:     tenant → none (setups.ts only injects when present)
 * OG image:    tenant light logo → the bundled ``public/img/logo.png``
 *              card on the platform tenant's own origin (platform only)
 */
export function useTenantBranding() {
  const tenantStore = useTenantStore()
  const siteConfig = useSiteConfig()
  const isPlatform = useIsPlatformTenant()

  const logoLightUrl = computed(
    () =>
      tenantStore.logoLightUrl
      || (isPlatform.value ? '/img/logo-navbar.png' : ''),
  )
  const logoDarkUrl = computed(
    () => tenantStore.logoDarkUrl || logoLightUrl.value,
  )
  const faviconUrl = computed(() => tenantStore.faviconUrl || '')
  // Absolute on purpose: og:image must be a full URL, and siteConfig.url
  // is already the tenant's own origin (4.tenant-site-config.ts).
  const ogImageUrl = computed(
    () =>
      tenantStore.logoLightUrl
      || (isPlatform.value ? `${siteConfig.url}/img/logo.png` : ''),
  )

  return { logoLightUrl, logoDarkUrl, faviconUrl, ogImageUrl }
}
