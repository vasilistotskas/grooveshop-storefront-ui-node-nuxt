export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const siteConfig = getSiteConfig(event)

  const name = siteConfig.name || config.public.appTitle || 'GrooveShop'
  const description = siteConfig.description || ''
  const lang = siteConfig.defaultLocale || 'el'

  setHeader(event, 'Content-Type', 'application/manifest+json')

  return {
    name,
    short_name: name.split(/[-–—|·]/)[0]!.trim().slice(0, 12) || name,
    description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1a202c',
    lang,
    dir: 'ltr',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/favicon/android-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/favicon/android-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
})
