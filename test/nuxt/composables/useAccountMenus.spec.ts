import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const route = vi.hoisted(() => ({ name: 'account___el', path: '/account', fullPath: '/account', params: {}, query: {}, hash: '', meta: {}, matched: [] }))
mockNuxtImport('useRoute', () => () => route)

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
    Object.assign(route, { name: 'account___el', path: '/account', fullPath: '/account' })
  })

  // Which entry is current is the platform's account navigation's
  // answer, so webside marks the same pages as the default design: the
  // section's own page as the page, a page under it as the location.
  it.each([
    { at: { name: 'account-orders___el', path: '/account/orders' }, mark: 'page' },
    { at: { name: 'account-orders-id___el', path: '/account/orders/70' }, mark: 'location' },
    { at: { name: 'account-favourites-posts___el', path: '/account/favourites/posts' }, mark: 'page' },
  ])('marks the entry the shopper is in on $at.path as the $mark, active', ({ at, mark }) => {
    Object.assign(route, at, { fullPath: at.path })

    const current = useAccountMenus().menus.value
      .filter(menu => menu.active)
      .map(menu => [menu.to, menu['aria-current']])

    expect(current).toEqual([[at.path.startsWith('/account/orders') ? '/account/orders' : at.path, mark]])
  })

  it('lists the base account pages in order, translated, with settings and security last and reviews after them', () => {
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
      { label: t('account_nav.security'), to: '/account/security' },
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

  it('hides the gift-card entry on a store without the catalogue its page needs', () => {
    setTenantFeatures({ giftCards: true, catalogue: false })

    expect(pathsOf()).not.toContain('/account/gift-cards')
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
