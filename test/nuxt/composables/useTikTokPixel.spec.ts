/**
 * Tests for app/composables/useTikTokPixel.ts and
 * setupTikTokPixelConsent (app/composables/setups.ts) — both are
 * TENANT-ONLY, no platform/env fallback (every tenant provisions its own
 * Pixel; a shared id would mix ad accounts across merchants), mirroring
 * useMetaPixel/setupMetaPixelConsent.
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

describe('useTikTokPixel — tenant-only pixel id resolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    scriptTikTokPixelMock.mockClear()
  })

  it('is provisioned and registers the tenant pixel id when the tenant has one', () => {
    setTenantPixelId('TENANT_TT_ID')

    const { isProvisioned } = useTikTokPixel()

    expect(isProvisioned).toBe(true)
    expect(scriptTikTokPixelMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'TENANT_TT_ID' }),
    )
  })

  it('is not provisioned when the tenant has no pixel id', () => {
    setTenantPixelId('')

    const { isProvisioned } = useTikTokPixel()

    expect(isProvisioned).toBe(false)
    expect(scriptTikTokPixelMock).not.toHaveBeenCalled()
  })
})

describe('setupTikTokPixelConsent — tenant-only pixel id resolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    scriptTikTokPixelMock.mockClear()
    triggerConsentMock.mockClear()
  })

  it('registers the tenant pixel id behind the consent trigger', () => {
    setTenantPixelId('TENANT_TT_ID')

    setupTikTokPixelConsent()

    expect(scriptTikTokPixelMock).toHaveBeenCalledWith({
      id: 'TENANT_TT_ID',
      // bundle:false is load-bearing: bundling would fetch the vendor
      // script into the shared image at build time (per-tenant
      // analytics must load from the vendor at runtime).
      scriptOptions: { trigger: 'consent-trigger', bundle: false },
    })
  })

  it('is a no-op when the tenant has no pixel id', () => {
    setTenantPixelId('')

    setupTikTokPixelConsent()

    expect(scriptTikTokPixelMock).not.toHaveBeenCalled()
  })
})
