/**
 * Unit tests for app/stores/tenant.ts
 *
 * Covers the stripePublishableKey computed:
 * - Returns empty string when no config is set.
 * - Returns the tenant key when the tenant has one configured.
 * - Returns empty string (callers fall back to the platform key) when
 *   the tenant's stripePublishableKey is an empty string.
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
