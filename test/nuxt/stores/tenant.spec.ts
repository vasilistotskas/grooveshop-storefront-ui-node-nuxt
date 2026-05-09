/**
 * Unit tests for app/stores/tenant.ts
 *
 * Covers computed fields that expose new TenantConfig fields with
 * empty-string fallback semantics: callers should read the computed
 * and substitute their own platform-level fallback when the value is ''.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTenantStore } from '~/stores/tenant'

function makeTenantConfig(overrides: Partial<TenantConfig> = {}): TenantConfig {
  return {
    schemaName: 'test',
    name: 'Test',
    storeName: 'Test Store',
    storeDescription: '',
    logoLightUrl: '',
    logoDarkUrl: '',
    faviconUrl: '',
    primaryColor: 'neutral',
    neutralColor: 'zinc',
    accentHex: '#003DFF',
    successHex: '#00C853',
    warningHex: '#FFD600',
    errorHex: '#D50000',
    infoHex: '#2979FF',
    themePreset: 'default',
    themeMetadata: null,
    defaultLocale: 'el',
    defaultCurrency: 'EUR',
    primaryDomain: 'test.local',
    loyaltyEnabled: false,
    blogEnabled: true,
    stripePublishableKey: '',
    allowedCspSources: [],
    metaPixelId: '',
    gaTrackingId: '',
    totpIssuer: '',
    turnstileSiteKey: '',
    socialsDiscord: '',
    socialsFacebook: '',
    socialsInstagram: '',
    socialsPinterest: '',
    socialsReddit: '',
    socialsTiktok: '',
    socialsTwitter: '',
    socialsYoutube: '',
    boxNowPartnerId: '',
    ...overrides,
  }
}

describe('useTenantStore — stripePublishableKey', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns empty string before any config is loaded', () => {
    const store = useTenantStore()
    expect(store.stripePublishableKey).toBe('')
  })

  it('returns the tenant key when the config has one', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ stripePublishableKey: 'pk_live_tenant_abc123' }))
    expect(store.stripePublishableKey).toBe('pk_live_tenant_abc123')
  })

  it('returns empty string when the tenant key is an empty string (callers fall back to platform key)', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ stripePublishableKey: '' }))
    expect(store.stripePublishableKey).toBe('')
  })

  it('is reactive — updates when setConfig is called again', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ stripePublishableKey: 'pk_test_first' }))
    expect(store.stripePublishableKey).toBe('pk_test_first')

    store.setConfig(makeTenantConfig({ stripePublishableKey: 'pk_test_second' }))
    expect(store.stripePublishableKey).toBe('pk_test_second')
  })

  it('returns empty string after setConfig(null)', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ stripePublishableKey: 'pk_test_key' }))
    store.setConfig(null)
    expect(store.stripePublishableKey).toBe('')
  })
})

describe('useTenantStore — metaPixelId', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns empty string before any config is loaded', () => {
    expect(useTenantStore().metaPixelId).toBe('')
  })

  it('returns the tenant pixel id when configured', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ metaPixelId: '1234567890' }))
    expect(store.metaPixelId).toBe('1234567890')
  })

  it('returns empty string (callers fall back to platform id) when empty', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ metaPixelId: '' }))
    expect(store.metaPixelId).toBe('')
  })
})

describe('useTenantStore — gaTrackingId', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns empty string before any config is loaded', () => {
    expect(useTenantStore().gaTrackingId).toBe('')
  })

  it('returns the tenant GA id when configured', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ gaTrackingId: 'G-TENANT12345' }))
    expect(store.gaTrackingId).toBe('G-TENANT12345')
  })

  it('returns empty string (callers fall back to platform id) when empty', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ gaTrackingId: '' }))
    expect(store.gaTrackingId).toBe('')
  })
})

describe('useTenantStore — turnstileSiteKey', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns empty string before any config is loaded', () => {
    expect(useTenantStore().turnstileSiteKey).toBe('')
  })

  it('returns the tenant site key when configured', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ turnstileSiteKey: '0x4AAAAAABtest123' }))
    expect(store.turnstileSiteKey).toBe('0x4AAAAAABtest123')
  })

  it('returns empty string (callers fall back to platform key) when empty', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ turnstileSiteKey: '' }))
    expect(store.turnstileSiteKey).toBe('')
  })
})

describe('useTenantStore — boxNowPartnerId', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns empty string before any config is loaded', () => {
    expect(useTenantStore().boxNowPartnerId).toBe('')
  })

  it('returns the tenant partner id when configured', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ boxNowPartnerId: '10391' }))
    expect(store.boxNowPartnerId).toBe('10391')
  })

  it('returns empty string (callers fall back to platform id) when empty', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ boxNowPartnerId: '' }))
    expect(store.boxNowPartnerId).toBe('')
  })
})

describe('useTenantStore — socials', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns all empty strings before any config is loaded', () => {
    const store = useTenantStore()
    expect(store.socials).toEqual({
      discord: '',
      facebook: '',
      instagram: '',
      pinterest: '',
      reddit: '',
      tiktok: '',
      twitter: '',
      youtube: '',
    })
  })

  it('returns tenant social URLs when configured', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({
      socialsInstagram: 'https://instagram.com/mytenant',
      socialsFacebook: 'https://facebook.com/mytenant',
    }))
    expect(store.socials.instagram).toBe('https://instagram.com/mytenant')
    expect(store.socials.facebook).toBe('https://facebook.com/mytenant')
    // un-set fields remain empty
    expect(store.socials.discord).toBe('')
  })

  it('returns empty strings (callers fall back to platform) when all fields are empty', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig())
    expect(store.socials.instagram).toBe('')
    expect(store.socials.twitter).toBe('')
  })

  it('is reactive — updates when setConfig is called again', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ socialsInstagram: 'https://instagram.com/first' }))
    expect(store.socials.instagram).toBe('https://instagram.com/first')

    store.setConfig(makeTenantConfig({ socialsInstagram: 'https://instagram.com/second' }))
    expect(store.socials.instagram).toBe('https://instagram.com/second')
  })

  it('resets to empty strings after setConfig(null)', () => {
    const store = useTenantStore()
    store.setConfig(makeTenantConfig({ socialsInstagram: 'https://instagram.com/test' }))
    store.setConfig(null)
    expect(store.socials.instagram).toBe('')
  })
})
