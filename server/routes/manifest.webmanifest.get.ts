export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteConfig = getSiteConfig(event)
  const tenant = event.context.tenant as TenantConfig | undefined

  // Prefer tenant-supplied values, fall back to site config / build-time config
  const name = tenant?.storeName || siteConfig.name || config.public.appTitle || 'GrooveShop'
  const description = siteConfig.description || ''
  const lang = tenant?.defaultLocale || siteConfig.defaultLocale || 'el'

  // Derive theme_color from the tenant accent hex (if provided) or fall back
  // to the brand default. Strip leading '#' that the frontend palette sometimes
  // omits — the manifest spec requires the full CSS colour value.
  const tenantAccent = tenant?.accentHex
  const themeColor = tenantAccent
    ? (tenantAccent.startsWith('#') ? tenantAccent : `#${tenantAccent}`)
    : '#1a202c'

  setHeader(event, 'Content-Type', 'application/manifest+json')

  // Icon list — prefer the tenant favicon for a branded install experience.
  // The spec recommends at least 192×192 and 512×512.  We use the tenant
  // favicon URL for both sizes when available (the URL itself is already
  // served at the correct dimensions by the media service). Platform fallback
  // icons are retained so a fresh-install before the tenant is resolved
  // still produces a valid manifest.
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
    : [
        { src: '/favicon/android-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/favicon/android-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        // TODO: Replace with a dedicated maskable icon asset that has at least
        // 10% safe-zone padding so the visible area is not clipped by the OS
        // mask shape (circles, squircles, etc.). See: https://web.dev/maskable-icon/
        { src: '/favicon/android-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]

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
