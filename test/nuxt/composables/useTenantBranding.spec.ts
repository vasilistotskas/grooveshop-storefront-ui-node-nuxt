/**
 * The bundled `public/img/logo*` assets are the PLATFORM's brand. A
 * store without its own logo must render its name, never another
 * store's wordmark or OG card — that leak is what these tests guard.
 */
import { describe, it, expect } from 'vitest'
import { setTenant } from '~~/test/helpers/tenant'

describe('useTenantBranding', () => {
  it('uses the store\'s own logos when it has them, on any tenant', () => {
    setTenant({
      isPlatformStorefront: false,
      logoLightUrl: 'https://shop.test/light.png',
      logoDarkUrl: 'https://shop.test/dark.png',
      faviconUrl: 'https://shop.test/favicon.png',
    })

    const branding = useTenantBranding()

    expect(branding.logoLightUrl.value).toBe('https://shop.test/light.png')
    expect(branding.logoDarkUrl.value).toBe('https://shop.test/dark.png')
    expect(branding.faviconUrl.value).toBe('https://shop.test/favicon.png')
    expect(branding.ogImageUrl.value).toBe('https://shop.test/light.png')
  })

  it('gives an unbranded store no logo, dark logo or OG image at all', () => {
    setTenant({ isPlatformStorefront: false, logoLightUrl: '', logoDarkUrl: '', faviconUrl: '' })

    const branding = useTenantBranding()

    expect(branding.logoLightUrl.value).toBe('')
    expect(branding.logoDarkUrl.value).toBe('')
    expect(branding.faviconUrl.value).toBe('')
    expect(branding.ogImageUrl.value).toBe('')
  })

  it('falls back to the bundled platform assets on the platform storefront only', () => {
    setTenant({ isPlatformStorefront: true, logoLightUrl: '', logoDarkUrl: '' })

    const branding = useTenantBranding()

    expect(branding.logoLightUrl.value).toBe('/img/logo-navbar.png')
    expect(branding.logoDarkUrl.value).toBe('/img/logo-navbar.png')
    // og:image must be absolute; the site URL is the tenant's own origin.
    expect(branding.ogImageUrl.value).toBe(`${useSiteConfig().url}/img/logo.png`)
  })

  it('reuses the light logo in dark mode when the store set no dark one', () => {
    setTenant({ isPlatformStorefront: false, logoLightUrl: 'https://shop.test/light.png', logoDarkUrl: '' })

    expect(useTenantBranding().logoDarkUrl.value).toBe('https://shop.test/light.png')
  })

  it('follows the tenant when the config changes after the composable was created', () => {
    setTenant({ isPlatformStorefront: true, logoLightUrl: '' })
    const { logoLightUrl } = useTenantBranding()

    setTenant({ isPlatformStorefront: false, logoLightUrl: '' })

    expect(logoLightUrl.value).toBe('')
  })
})
