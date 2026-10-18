import { describe, it, expect, beforeEach } from 'vitest'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The account menu offers a page only while the store has the feature
 * behind it: `TenantConfig.features`, the same answer as the page's route
 * middleware, and nothing else (no plan flag, no setting, no request).
 */
const pathsOf = () => useAccountMenus().menus.value.map(m => m.to)

describe('useAccountMenus', () => {
  beforeEach(() => {
    // A store with the blog, so favourites lead to the saved posts.
    setTenant()
    setTenantFeatures({ blog: true })
  })

  it('lists the base account pages in order, translated, with settings last and reviews after it', () => {
    const { menus } = useAccountMenus()
    const t = useNuxtApp().$i18n.t

    expect(menus.value.map(({ label, to }) => ({ label, to }))).toEqual([
      { label: t('account'), to: '/account' },
      { label: t('orders'), to: '/account/orders' },
      { label: t('favourites'), to: '/account/favourites/posts' },
      { label: t('notifications'), to: '/account/notifications' },
      { label: t('subscriptions'), to: '/account/subscriptions' },
      { label: t('addresses'), to: '/account/addresses' },
      { label: t('settings'), to: '/account/settings' },
      { label: t('reviews'), to: '/account/reviews' },
    ])
  })

  it.each([
    ['accountReviews', '/account/reviews'],
    ['favourites', '/account/favourites/posts'],
    ['newsletter', '/account/subscriptions'],
  ] as const)('hides the entry for a store without the %s feature', (feature, path) => {
    setTenantFeatures({ [feature]: false })

    const paths = pathsOf()

    expect(paths).not.toContain(path)
    expect(paths).toContain('/account/orders')
  })

  it('leads favourites to the saved products on a store without the blog', () => {
    setTenantFeatures({ blog: false })

    const paths = pathsOf()

    expect(paths).toContain('/account/favourites/products')
    expect(paths).not.toContain('/account/favourites/posts')
  })

  it('never offers the deleted help page', () => {
    expect(pathsOf()).not.toContain('/account/help')
  })

  describe.each([
    { entry: 'loyalty', path: '/account/loyalty', feature: 'loyalty', plan: { loyaltyEnabled: true } },
    { entry: 'gift cards', path: '/account/gift-cards', feature: 'giftCards', plan: { giftCardsEnabled: true } },
    { entry: 'business account', path: '/account/business', feature: 'wholesale', plan: { b2bEnabled: true } },
  ] as const)('the $entry entry', ({ path, feature, plan }) => {
    it('shows, just before settings, when the store has the feature', () => {
      setTenantFeatures({ [feature]: true })

      const paths = pathsOf()

      expect(paths).toContain(path)
      expect(paths.indexOf(path)).toBe(paths.indexOf('/account/settings') - 1)
    })

    it('stays hidden when the store lacks the feature, even with the plan flag on', () => {
      setTenant(plan)
      setTenantFeatures({ [feature]: false })

      expect(pathsOf()).not.toContain(path)
    })
  })
})
