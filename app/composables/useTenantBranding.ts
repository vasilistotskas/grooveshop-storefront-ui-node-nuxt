/**
 * Single home for tenant branding fallback chains — the meta/og
 * consumers (`useSeoMeta`, manifest, error page) and `<TenantLogo>`
 * both resolve through here so the chain never forks.
 *
 * Light logo:  tenant → platform navbar asset
 * Dark logo:   tenant dark → tenant light → platform navbar asset
 *              (the platform never had a dark navbar variant — dark
 *              mode always rendered the same asset, and webside must
 *              stay pixel-identical; only tenants that SET a dark logo
 *              get one)
 * Favicon:     tenant → none (setups.ts only injects when present)
 * OG image:    tenant light logo → NUXT_PUBLIC_APP_LOGO
 */
export function useTenantBranding() {
  const tenantStore = useTenantStore()
  const config = useRuntimeConfig()

  const logoLightUrl = computed(
    () => tenantStore.logoLightUrl || '/img/logo-navbar.png',
  )
  const logoDarkUrl = computed(
    () =>
      tenantStore.logoDarkUrl
      || tenantStore.logoLightUrl
      || '/img/logo-navbar.png',
  )
  const faviconUrl = computed(() => tenantStore.faviconUrl || '')
  const ogImageUrl = computed(
    () => tenantStore.logoLightUrl || (config.public.appLogo as string),
  )

  return { logoLightUrl, logoDarkUrl, faviconUrl, ogImageUrl }
}
