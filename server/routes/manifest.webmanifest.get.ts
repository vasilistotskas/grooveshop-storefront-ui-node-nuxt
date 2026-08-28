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

  // Icon list — tenant-scoped end-to-end: a branded tenant uses its
  // own favicon, the PLATFORM tenant uses the platform icon set, and
  // an unbranded tenant ships NO icons (valid per the manifest spec) —
  // another store's brand must never appear in a tenant's PWA install
  // surface.
  //
  // The tenant entry deliberately declares NO ``sizes`` and no
  // ``maskable`` purpose: faviconUrl points at an arbitrary
  // tenant-supplied asset whose dimensions and safe-zone padding we
  // cannot know here, and a declared size that disagrees with the
  // actual pixels makes Chrome reject the icon with a console error
  // ("Resource size is not correct — typo in the Manifest?", observed
  // live on tenant #2's 96x96 favicon declared as 192/512). ``sizes``
  // is optional; omitting it lets the browser measure the resource.
  const faviconUrl = tenant?.faviconUrl
  const faviconType = {
    png: 'image/png',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  }[faviconUrl?.split('.').pop()?.toLowerCase() ?? '']
  const icons = faviconUrl
    ? [
        {
          src: faviconUrl,
          purpose: 'any',
          ...(faviconType ? { type: faviconType } : {}),
        },
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
