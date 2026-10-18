import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The default account navigation (the shell's sidebar, the overview's
 * tiles): the boards' order, each gated page offered only while the store
 * has its feature (`TenantConfig.features`, the same answer as its route
 * middleware), and an entry active on the pages under it.
 */
const state = vi.hoisted(() => ({
  unseen: 0,
  route: 'account___el',
}))

mockNuxtImport('useUnseenNotificationsCount', () => () => ({ count: computed(() => state.unseen), pending: computed(() => false) }))
mockNuxtImport('useRoute', () => () => ({ name: state.route, path: '/', fullPath: '/', params: {}, query: {}, hash: '', meta: {}, matched: [] }))

function navigation() {
  return useAccountNavigation()
}

const keys = () => navigation().items.value.map(item => item.key)

describe('useAccountNavigation', () => {
  beforeEach(() => {
    state.unseen = 0
    state.route = 'account___el'
    setTenant()
    setTenantFeatures({ loyalty: false, giftCards: false, wholesale: false })
  })

  it('offers the account pages in the order of the boards', () => {
    setTenantFeatures({ loyalty: true, giftCards: true, wholesale: true })

    expect(keys()).toEqual([
      'overview', 'orders', 'addresses', 'favourites', 'reviews', 'notifications',
      'rewards', 'gift_cards', 'business', 'newsletter', 'profile', 'security', 'privacy',
    ])
  })

  it('links each page in the current locale', () => {
    const { items } = navigation()

    expect(items.value.find(item => item.key === 'orders')?.to).toBe(useLocalePath()('account-orders'))
  })

  it.each([
    ['favourites', 'favourites'],
    ['reviews', 'accountReviews'],
    ['newsletter', 'newsletter'],
  ] as const)('leaves out %s for a store without the %s feature', (key, feature) => {
    setTenantFeatures({ [feature]: false })

    expect(keys()).not.toContain(key)
  })

  it.each([
    ['rewards', 'loyalty', { loyaltyEnabled: true }],
    ['gift_cards', 'giftCards', { giftCardsEnabled: true }],
    ['business', 'wholesale', { b2bEnabled: true }],
  ] as const)('offers %s exactly when the store has the %s feature, whatever its plan flag says', (key, feature, plan) => {
    setTenant(plan)
    setTenantFeatures({ [feature]: false })
    expect(keys()).not.toContain(key)

    setTenant({ [Object.keys(plan)[0]!]: false })
    setTenantFeatures({ [feature]: true })
    expect(keys()).toContain(key)
  })

  it.each([
    ['account-orders-id___el', 'orders'],
    ['account-addresses-new___el', 'addresses'],
    ['account-favourites-posts___el', 'favourites'],
    ['account-settings___el', 'profile'],
    ['account-security___el', 'security'],
    ['account-password-change___el', 'security'],
    ['account-sessions___el', 'security'],
    ['account-2fa-totp-activate___el', 'security'],
    ['account-settings-privacy___el', 'privacy'],
  ])('keeps the right entry active on %s', async (route, key) => {
    state.route = route

    const { items } = await navigation()

    expect(items.value.filter(item => item.active).map(item => item.key)).toEqual([key])
  })

  it('knows when the overview itself is on screen', () => {
    expect(navigation().onOverview.value).toBe(true)

    state.route = 'account-orders___el'
    expect(navigation().onOverview.value).toBe(false)
  })

  it('counts unseen notifications beside their entry, and nothing when all are seen', () => {
    state.unseen = 3
    const notifications = () => navigation().items.value.find(item => item.key === 'notifications')

    expect(notifications()?.badge).toBe(3)

    state.unseen = 0
    expect(notifications()?.badge).toBeUndefined()
  })
})
