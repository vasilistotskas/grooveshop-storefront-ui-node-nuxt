import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setTenant, setTenantPreferences } from '~~/test/helpers/tenant'
import { useTenantStore } from '~/stores/tenant'

/**
 * A store preference is Django's answer in `TenantConfig.preferences`,
 * read like a store feature: from the tenant payload, with no request of
 * its own and no default the storefront keeps.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

describe('useStorePreference', () => {
  beforeEach(() => {
    setTenant()
  })

  it('reads each preference from the tenant payload', () => {
    setTenantPreferences({ cart: false, mobileBottomNav: true })

    expect(useStorePreference('cart').value).toBe(false)
    expect(useStorePreference('mobileBottomNav').value).toBe(true)
  })

  it('follows the payload when the store changes it', () => {
    const catalogue = useStorePreference('catalogue')
    expect(catalogue.value).toBe(true)

    setTenantPreferences({ catalogue: false })

    expect(catalogue.value).toBe(false)
  })

  it('asks the settings endpoint for nothing', () => {
    useStorePreference('demoAccount')

    expect(api.callsTo('/api/settings/public')).toEqual([])
  })

  it('has none of them without a resolved store', () => {
    useTenantStore().setConfig(null)

    expect(useStorePreference('cart').value).toBe(false)
  })
})
