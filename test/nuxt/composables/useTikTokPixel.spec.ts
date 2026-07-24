/**
 * Tests for app/composables/useTikTokPixel.ts and
 * setupTikTokPixelConsent (app/composables/setups.ts) — both must prefer
 * the tenant's tiktokPixelId over the platform-wide
 * NUXT_PUBLIC_TIKTOK_PIXEL_ID env var, mirroring useMetaPixel/
 * setupMetaPixelConsent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'

const { scriptTikTokPixelMock, triggerConsentMock } = vi.hoisted(() => ({
  scriptTikTokPixelMock: vi.fn(() => ({ proxy: { ttq: { track: vi.fn() } } })),
  triggerConsentMock: vi.fn(() => 'consent-trigger'),
}))
mockNuxtImport('useScriptTikTokPixel', () => scriptTikTokPixelMock)
mockNuxtImport('useScriptTriggerConsent', () => triggerConsentMock)

mockNuxtImport('useCookieControl', () => () => ({
  isConsentGiven: { value: true },
  cookiesEnabledIds: { value: ['ad_storage'] },
}))

const { useTikTokPixel } = await import('~/composables/useTikTokPixel')
const { setupTikTokPixelConsent } = await import('~/composables/setups')

function setTenantPixelId(id: string) {
  const tenantStore = useTenantStore()
  tenantStore.setConfig({
    ...(tenantStore.config ?? {}),
    tiktokPixelId: id,
  } as TenantConfig)
}

describe('useTikTokPixel — tenant-first pixel id resolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    scriptTikTokPixelMock.mockClear()
  })

  it('is provisioned and registers the tenant pixel id when the tenant has one, even without a platform env var', () => {
    const config = useRuntimeConfig()
    config.public.tiktokPixelId = ''
    setTenantPixelId('TENANT_TT_ID')

    const { isProvisioned } = useTikTokPixel()

    expect(isProvisioned).toBe(true)
    expect(scriptTikTokPixelMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'TENANT_TT_ID' }),
    )
  })

  it('prefers the tenant pixel id over the platform-wide one when both are set', () => {
    const config = useRuntimeConfig()
    config.public.tiktokPixelId = 'PLATFORM_TT_ID'
    setTenantPixelId('TENANT_TT_ID')

    useTikTokPixel()

    expect(scriptTikTokPixelMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'TENANT_TT_ID' }),
    )
  })

  it('falls back to the platform pixel id when the tenant has none', () => {
    const config = useRuntimeConfig()
    config.public.tiktokPixelId = 'PLATFORM_TT_ID'
    setTenantPixelId('')

    const { isProvisioned } = useTikTokPixel()

    expect(isProvisioned).toBe(true)
    expect(scriptTikTokPixelMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'PLATFORM_TT_ID' }),
    )
  })

  it('is not provisioned when neither the tenant nor the platform has a pixel id', () => {
    const config = useRuntimeConfig()
    config.public.tiktokPixelId = ''
    setTenantPixelId('')

    const { isProvisioned } = useTikTokPixel()

    expect(isProvisioned).toBe(false)
    expect(scriptTikTokPixelMock).not.toHaveBeenCalled()
  })
})

describe('setupTikTokPixelConsent — tenant-first pixel id resolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    scriptTikTokPixelMock.mockClear()
    triggerConsentMock.mockClear()
  })

  it('registers the tenant pixel id behind the consent trigger', () => {
    const config = useRuntimeConfig()
    config.public.tiktokPixelId = 'PLATFORM_TT_ID'
    setTenantPixelId('TENANT_TT_ID')

    setupTikTokPixelConsent()

    expect(scriptTikTokPixelMock).toHaveBeenCalledWith({
      id: 'TENANT_TT_ID',
      scriptOptions: { trigger: 'consent-trigger' },
    })
  })

  it('is a no-op when neither the tenant nor the platform provisions a pixel id', () => {
    const config = useRuntimeConfig()
    config.public.tiktokPixelId = ''
    setTenantPixelId('')

    setupTikTokPixelConsent()

    expect(scriptTikTokPixelMock).not.toHaveBeenCalled()
  })
})
