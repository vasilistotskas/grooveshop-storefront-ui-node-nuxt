/**
 * Unit tests for server/routes/manifest.webmanifest.get.ts
 *
 * Verifies that tenant fields (storeName, accentHex, faviconUrl, defaultLocale)
 * override platform defaults in the generated manifest, and — since this
 * route is bypassed in 0.tenant.ts — that it resolves tenant context itself
 * via getTenantConfig() when event.context.tenant is absent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stub Nuxt auto-imports before importing the module
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { appTitle: 'GrooveShop Platform' },
}))

const siteConfigMock = vi.fn().mockReturnValue({
  name: 'Platform Store',
  description: 'Default description',
  defaultLocale: 'en',
})
vi.stubGlobal('getSiteConfig', siteConfigMock)

const setHeaderMock = vi.fn()
vi.stubGlobal('setHeader', setHeaderMock)

const hostMock = vi.fn().mockReturnValue('example.com')
vi.stubGlobal('getRequestHost', hostMock)

const getTenantConfigMock = vi.fn().mockResolvedValue({ type: 'not_found', config: null })
vi.stubGlobal('getTenantConfig', getTenantConfigMock)

vi.stubGlobal('defineEventHandler', (fn: (event: unknown) => unknown) => fn)

const module = await import('../../../../server/routes/manifest.webmanifest.get')
const handler = (module.default ?? module) as unknown as (event: unknown) => Promise<Record<string, unknown>>

function makeEvent(tenant?: Partial<{
  storeName: string
  accentHex: string
  faviconUrl: string
  defaultLocale: string
}>): { context: Record<string, unknown> } {
  return { context: tenant ? { tenant } : {} }
}

describe('manifest.webmanifest handler', () => {
  beforeEach(() => {
    siteConfigMock.mockReturnValue({
      name: 'Platform Store',
      description: 'Default description',
      defaultLocale: 'en',
    })
    setHeaderMock.mockReset()
    hostMock.mockReturnValue('example.com')
    getTenantConfigMock.mockReset()
    getTenantConfigMock.mockResolvedValue({ type: 'not_found', config: null })
  })

  it('uses platform defaults when no tenant is in context and resolution fails', async () => {
    const manifest = await handler(makeEvent())
    expect(manifest.name).toBe('Platform Store')
    expect(manifest.theme_color).toBe('#1a202c')
    expect(manifest.lang).toBe('en')
    // Platform fallback icons
    const icons = manifest.icons as Array<{ src: string }>
    expect(icons.some(i => i.src.includes('/favicon/android-icon-192x192.png'))).toBe(true)
  })

  it('resolves tenant via getTenantConfig when event.context.tenant is absent', async () => {
    getTenantConfigMock.mockResolvedValueOnce({
      type: 'ok',
      config: { storeName: 'Resolved Tenant Store' },
    })
    const manifest = await handler(makeEvent())
    expect(getTenantConfigMock).toHaveBeenCalledWith('example.com')
    expect(manifest.name).toBe('Resolved Tenant Store')
  })

  it('uses tenant storeName for name and short_name', async () => {
    const manifest = await handler(makeEvent({ storeName: 'Webside Store' }))
    expect(manifest.name).toBe('Webside Store')
    // Resolving from event.context.tenant directly skips the getTenantConfig lookup
    expect(getTenantConfigMock).not.toHaveBeenCalled()
  })

  it('uses tenant accentHex (with #) for theme_color', async () => {
    const manifest = await handler(makeEvent({ accentHex: '#FF5733' }))
    expect(manifest.theme_color).toBe('#FF5733')
  })

  it('prepends # to tenant accentHex when missing', async () => {
    const manifest = await handler(makeEvent({ accentHex: 'FF5733' }))
    expect(manifest.theme_color).toBe('#FF5733')
  })

  it('uses tenant defaultLocale for lang', async () => {
    const manifest = await handler(makeEvent({ defaultLocale: 'el' }))
    expect(manifest.lang).toBe('el')
  })

  it('uses tenant faviconUrl as icon src', async () => {
    const faviconUrl = 'https://example.com/tenant-icon.png'
    const manifest = await handler(makeEvent({ faviconUrl }))
    const icons = manifest.icons as Array<{ src: string, purpose: string }>
    expect(icons.every(i => i.src === faviconUrl)).toBe(true)
    // Must have both 'any' and 'maskable' purposes
    expect(icons.some(i => i.purpose === 'any')).toBe(true)
    expect(icons.some(i => i.purpose === 'maskable')).toBe(true)
  })

  it('includes 192x192 and 512x512 sizes for tenant icon', async () => {
    const manifest = await handler(makeEvent({ faviconUrl: 'https://example.com/icon.png' }))
    const icons = manifest.icons as Array<{ sizes: string }>
    const sizeSet = new Set(icons.map(i => i.sizes))
    expect(sizeSet.has('192x192')).toBe(true)
    expect(sizeSet.has('512x512')).toBe(true)
  })

  it('sets Content-Type header to application/manifest+json', async () => {
    await handler(makeEvent())
    expect(setHeaderMock).toHaveBeenCalledWith(
      expect.anything(),
      'Content-Type',
      'application/manifest+json',
    )
  })
})
