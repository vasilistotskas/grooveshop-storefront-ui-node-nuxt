export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteConfig = getSiteConfig(event)

  // This route is bypassed in server/middleware/0.tenant.ts (fetched by the
  // browser independently of page navigation, sometimes with no real tenant
  // Host — e.g. a fresh PWA install probe), so `event.context.tenant` is
  // never populated here. Resolve it ourselves when a real Host is present;
  // any resolution failure (404/5xx/no host) just falls back to the
  // platform-default manifest below rather than erroring the response.
  const host = getRequestHost(event, { xForwardedHost: false })
  let tenant = event.context.tenant as TenantConfig | undefined
  if (!tenant && host) {
    const result = await getTenantConfig(host)
    if (result.type === 'ok') {
      tenant = result.config
    }
  }

  // Prefer tenant-supplied values, fall back to site config / build-time config
  const name = tenant?.storeName || siteConfig.name || config.public.appTitle || 'GrooveShop'
  const description = tenant?.storeDescription || siteConfig.description || ''
  const lang = tenant?.defaultLocale || siteConfig.defaultLocale || 'el'

  // Derive theme_color from the tenant accent hex (if provided) or fall back
  // to the brand default. Strip leading '#' that the frontend palette sometimes
  // omits — the manifest spec requires the full CSS colour value.
  const tenantAccent = tenant?.accentHex
  const themeColor = tenantAccent
    ? (tenantAccent.startsWith('#') ? tenantAccent : `#${tenantAccent}`)
    : '#1a202c'

  setHeader(event, 'Content-Type', 'application/manifest+json')

  // Icon list — tenant-scoped end-to-end: a branded tenant uses its own
  // favicon for all sizes (the URL is served at the right dimensions by
  // the media service), the PLATFORM tenant uses the platform icon set,
  // and an unbranded tenant ships NO icons (valid per the manifest
  // spec) — another store's brand must never appear in a tenant's PWA
  // install surface.
  const faviconUrl = tenant?.faviconUrl
  const icons = faviconUrl
    ? [
        { src: faviconUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: faviconUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
        // Maskable: same source as fallback. Replace with a dedicated
        // asset that has ≥10 % safe-zone padding on all sides so the
        // visible area is not clipped by the OS mask shape (circles,
        // squircles, etc.). See: https://web.dev/maskable-icon/
        { src: faviconUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]
    : isPlatformTenantConfig(tenant)
      ? [
          { src: '/platform-favicon/android-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/platform-favicon/android-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // TODO: Replace with a dedicated maskable icon asset that has at least
          // 10% safe-zone padding so the visible area is not clipped by the OS
          // mask shape (circles, squircles, etc.). See: https://web.dev/maskable-icon/
          { src: '/platform-favicon/android-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      : []

  return {
    name,
    short_name: name.split(/[-–—|·]/)[0]!.trim().slice(0, 12) || name,
    description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    lang,
    dir: 'ltr',
    categories: ['shopping', 'lifestyle'],
    icons,
  }
})
