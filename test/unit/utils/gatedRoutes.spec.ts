import { describe, expect, it } from 'vitest'
import {
  FEATURE_GATED_ROUTES,
  blockedFeaturePaths,
  featureRouteAllowed,
  isFeaturePathBlocked,
} from '~~/shared/utils/gatedRoutes'

/**
 * One rule for "is this route serving", mirrored from the pages' own
 * middlewares, read by the sitemap and the navigation menus alike. The
 * assertions below are the middleware behaviours, so a drift in either
 * consumer shows up here rather than as a footer link to a 404.
 */

const OPEN = {
  loyaltyEnabled: true,
  blogEnabled: true,
  promotionsEnabled: true,
  giftCardsEnabled: true,
}
const ON = { LOYALTY_ENABLED: 'True', PROMOTIONS_ENABLED: 'True', GIFT_CARDS_ENABLED: 'True', CATALOGUE_ENABLED: 'True', FEEDBACK_ENABLED: 'True' }
const route = (path: string) => FEATURE_GATED_ROUTES.find(r => r.path === path)!

describe('featureRouteAllowed', () => {
  it('serves everything on an open plan with every setting on', () => {
    for (const r of FEATURE_GATED_ROUTES) {
      expect(featureRouteAllowed(r, OPEN, ON), r.path).toBe(true)
    }
  })

  it('a plan flag off is a hard no, whatever the setting says', () => {
    // loyalty-enabled.ts checks the plan first and never reads the
    // setting when it is off.
    expect(featureRouteAllowed(route('/loyalty-program'), { ...OPEN, loyaltyEnabled: false }, ON)).toBe(false)
    expect(featureRouteAllowed(route('/offers'), { ...OPEN, promotionsEnabled: false }, ON)).toBe(false)
    expect(featureRouteAllowed(route('/gift-cards'), { ...OPEN, giftCardsEnabled: false }, ON)).toBe(false)
    expect(featureRouteAllowed(route('/blog'), { ...OPEN, blogEnabled: false }, ON)).toBe(false)
  })

  it('a commercial gate fails CLOSED on a missing setting', () => {
    // The seeded default of every commercial toggle is off.
    expect(featureRouteAllowed(route('/loyalty-program'), OPEN, {})).toBe(false)
    expect(featureRouteAllowed(route('/offers'), OPEN, {})).toBe(false)
    expect(featureRouteAllowed(route('/gift-cards'), OPEN, {})).toBe(false)
  })

  it('createSettingGate routes fail OPEN on a missing setting', () => {
    // A store that never set CATALOGUE_ENABLED serves its catalogue.
    expect(featureRouteAllowed(route('/products'), OPEN, {})).toBe(true)
    expect(featureRouteAllowed(route('/feedback'), OPEN, {})).toBe(true)
  })

  it('an explicit off closes a fail-open route too', () => {
    expect(featureRouteAllowed(route('/products'), OPEN, { CATALOGUE_ENABLED: 'False' })).toBe(false)
  })

  it('a failed settings lookup allows, like every route middleware', () => {
    // settingEnabled() catches the error and returns onError ?? fallback
    // (true for createSettingGate, `onError: true` for promotions), and
    // loyalty-enabled.ts returns without throwing. A menu or sitemap
    // that hid these on the same failure would disagree with the page.
    for (const r of FEATURE_GATED_ROUTES) {
      expect(featureRouteAllowed(r, OPEN, null), r.path).toBe(true)
    }
  })

  it('accepts the shared truthiness spellings', () => {
    expect(featureRouteAllowed(route('/offers'), OPEN, { PROMOTIONS_ENABLED: 'true' })).toBe(true)
    expect(featureRouteAllowed(route('/offers'), OPEN, { PROMOTIONS_ENABLED: '1' })).toBe(true)
  })
})

describe('blockedFeaturePaths', () => {
  it('lists exactly the routes that are not serving', () => {
    const blocked = blockedFeaturePaths(
      { ...OPEN, promotionsEnabled: false },
      { CATALOGUE_ENABLED: 'False' },
    )

    expect([...blocked].sort()).toEqual([
      '/gift-cards', // missing setting, fails closed
      '/loyalty-program', // missing setting, fails closed
      '/offers', // plan off
      '/products', // explicit off
    ])
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
