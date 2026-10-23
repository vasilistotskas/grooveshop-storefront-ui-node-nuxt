import { describe, expect, it } from 'vitest'
import {
  FEATURE_GATED_ROUTES,
  blockedFeaturePaths,
  featureRouteAllowed,
  isFeaturePathBlocked,
} from '~~/shared/utils/gatedRoutes'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

/**
 * One rule for "is this route serving", read by the sitemap and the
 * navigation menus alike. A route behind a store feature follows
 * `TenantConfig.features`, the catalogue (a preference until the API
 * gates it) `TenantConfig.preferences`, and nothing else. The assertions
 * are what the pages' middlewares do, so a drift in either consumer
 * shows up here rather than as a footer link to a 404.
 */

const FIXTURE = validTenantConfig('shop.test')
const ALL = Object.fromEntries(
  Object.keys(FIXTURE.features).map(name => [name, true]),
) as TenantConfig['features']
const tenant = (
  features: Partial<TenantConfig['features']> = {},
  preferences: Partial<TenantConfig['preferences']> = {},
) => ({
  features: { ...ALL, ...features },
  preferences: { ...FIXTURE.preferences, catalogue: true, ...preferences },
})
const route = (path: string) => FEATURE_GATED_ROUTES.find(r => r.path === path)!

describe('featureRouteAllowed', () => {
  it('serves everything when every feature is on and the catalogue is on', () => {
    for (const r of FEATURE_GATED_ROUTES) {
      expect(featureRouteAllowed(r, tenant()), r.path).toBe(true)
    }
  })

  it.each([
    ['/loyalty-program', 'loyalty'],
    ['/offers', 'promotions'],
    ['/gift-cards', 'giftCards'],
    ['/feedback', 'feedback'],
    ['/blog', 'blog'],
    ['/blog/categories', 'blog'],
  ] as const)('%s follows the %s feature and nothing else', (path, feature) => {
    expect(featureRouteAllowed(route(path), tenant({ [feature]: false }))).toBe(false)
    expect(featureRouteAllowed(route(path), tenant({ [feature]: true }))).toBe(true)
    expect(
      featureRouteAllowed(route(path), tenant({ [feature]: true }, { catalogue: false })),
      'a preference cannot close it',
    ).toBe(true)
  })

  it('has nothing without a resolved store', () => {
    expect(featureRouteAllowed(route('/offers'), null)).toBe(false)
    expect(featureRouteAllowed(route('/products'), undefined)).toBe(false)
  })

  describe('the catalogue, a preference until the API gates it', () => {
    it('follows the catalogue preference', () => {
      expect(featureRouteAllowed(route('/products'), tenant({}, { catalogue: true }))).toBe(true)
      expect(featureRouteAllowed(route('/products'), tenant({}, { catalogue: false }))).toBe(false)
    })

    it('does not depend on any feature', () => {
      expect(featureRouteAllowed(route('/products'), tenant({ blog: false, productReviews: false }))).toBe(true)
    })
  })
})

describe('blockedFeaturePaths', () => {
  it('lists exactly the routes that are not serving', () => {
    const blocked = blockedFeaturePaths(
      tenant({ promotions: false, loyalty: false }, { catalogue: false }),
    )

    expect([...blocked].sort()).toEqual([
      '/loyalty-program',
      '/offers',
      '/products',
    ])
  })

  it('blocks every feature route for a store with no features', () => {
    const blocked = blockedFeaturePaths(tenant(Object.fromEntries(Object.keys(ALL).map(k => [k, false]))))

    expect([...blocked].sort()).toEqual(
      FEATURE_GATED_ROUTES.filter(r => r.feature).map(r => r.path).sort(),
    )
  })
})

describe('isFeaturePathBlocked', () => {
  const blocked = new Set(['/products', '/offers'])

  it('matches the route itself', () => {
    expect(isFeaturePathBlocked('/offers', blocked)).toBe(true)
  })

  it('matches the subtree the same middleware guards', () => {
    expect(isFeaturePathBlocked('/products/category/5/phones', blocked)).toBe(true)
  })

  it('does not match a sibling that merely shares the prefix', () => {
    expect(isFeaturePathBlocked('/products-guide', blocked)).toBe(false)
  })

  it('looks through the locale prefix', () => {
    // Menu rows carry paths verbatim from Django; rendered links are
    // localised. Both spell the same destination.
    expect(isFeaturePathBlocked('/en/offers', blocked)).toBe(true)
  })

  it('leaves everything else alone', () => {
    expect(isFeaturePathBlocked('/contact', blocked)).toBe(false)
    expect(isFeaturePathBlocked('/', blocked)).toBe(false)
  })
})
