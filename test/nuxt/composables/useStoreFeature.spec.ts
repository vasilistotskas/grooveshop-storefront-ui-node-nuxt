import { describe, expect, it, beforeEach } from 'vitest'
import { setTenant } from '~~/test/helpers/tenant'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

const features = (overrides: Partial<TenantConfig['features']>) => ({
  ...validTenantConfig('test.local').features,
  ...overrides,
})

describe('useStoreFeature', () => {
  beforeEach(() => {
    setTenant()
  })

  it('follows TenantConfig.features', () => {
    setTenant({ features: features({ giftCards: true }) })
    const on = useStoreFeature('giftCards')
    expect(on.value).toBe(true)

    setTenant({ features: features({ giftCards: false }) })
    expect(on.value).toBe(false)
  })

  it('is not moved by a plan flag or a setting, only by features', () => {
    setTenant({ loyaltyEnabled: true, features: features({ loyalty: false }) })

    expect(useStoreFeature('loyalty').value).toBe(false)
  })
})
