import { describe, expect, it } from 'vitest'
import { storeFeatureOn } from '~~/shared/utils/storeFeature'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

const tenant = (features: Record<string, boolean>, overrides: Record<string, unknown> = {}) =>
  validTenantConfig('shop.test', {
    features: { ...validTenantConfig('shop.test').features, ...features },
    ...overrides,
  }) as TenantConfig

/**
 * The one rule: `TenantConfig.features` is the whole answer. Nothing
 * beside it (a plan flag, a setting, a default) can move it.
 */
describe('storeFeatureOn', () => {
  it('is what Django says, on or off', () => {
    expect(storeFeatureOn(tenant({ loyalty: true }), 'loyalty')).toBe(true)
    expect(storeFeatureOn(tenant({ loyalty: false }), 'loyalty')).toBe(false)
  })

  it('answers each feature from its own entry', () => {
    const only = tenant({ blog: false, giftCards: true })

    expect(storeFeatureOn(only, 'giftCards')).toBe(true)
    expect(storeFeatureOn(only, 'blog')).toBe(false)
  })

  it('ignores the plan flags the payload still carries', () => {
    const off = tenant({ loyalty: false, blog: false }, { loyaltyEnabled: true, blogEnabled: true })
    const on = tenant({ loyalty: true, blog: true }, { loyaltyEnabled: false, blogEnabled: false })

    expect(storeFeatureOn(off, 'loyalty')).toBe(false)
    expect(storeFeatureOn(off, 'blog')).toBe(false)
    expect(storeFeatureOn(on, 'loyalty')).toBe(true)
    expect(storeFeatureOn(on, 'blog')).toBe(true)
  })

  it.each([[null], [undefined]])('has no feature when no store resolved (%s)', (absent) => {
    expect(storeFeatureOn(absent, 'blog')).toBe(false)
    expect(storeFeatureOn(absent, 'productReviews')).toBe(false)
  })
})
