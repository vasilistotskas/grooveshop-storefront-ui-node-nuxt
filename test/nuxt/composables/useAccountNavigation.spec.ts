import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The default account navigation (the shell's sidebar, the overview's
 * tiles): the boards' order, each gated page offered only while it
 * serves — the same plan flags and merchant switches as its route
 * middleware — and an entry active on the pages under it.
 */
const state = vi.hoisted(() => ({
  loyalty: false,
  settings: {} as Record<string, string>,
  unseen: 0,
  route: 'account___el',
}))

const GATED_KEYS = ['ACCOUNT_REVIEWS_ENABLED', 'FAVOURITES_ENABLED', 'NEWSLETTER_ENABLED', 'GIFT_CARDS_ENABLED', 'B2B_WHOLESALE_ENABLED']
const servedSettings = () => Object.fromEntries(GATED_KEYS.map(key => [key, state.settings[key] ?? 'True']))
registerEndpoint('/api/settings/public', () => ({ settings: servedSettings() }))

mockNuxtImport('useLoyalty', () => () => ({
  fetchSettings: () => ({ data: computed(() => ({ ...defaultLoyaltySettings(), enabled: state.loyalty })) }),
}))
mockNuxtImport('useUnseenNotificationsCount', () => () => ({ count: computed(() => state.unseen), pending: computed(() => false) }))
mockNuxtImport('useRoute', () => () => ({ name: state.route, path: '/', fullPath: '/', params: {}, query: {}, hash: '', meta: {}, matched: [] }))

/** The navigation once the store's settings have landed: before that every flag sits on its fallback. */
async function navigation() {
  const result = useAccountNavigation()
  const { settings } = useStoreSettings()
  await vi.waitFor(() => expect(settings.value).toEqual(servedSettings()), { interval: 1 })
  return result
}

const keys = async () => (await navigation()).items.value.map(item => item.key)

describe('useAccountNavigation', () => {
  beforeEach(() => {
    state.loyalty = false
    state.settings = {}
    state.unseen = 0
    state.route = 'account___el'
    setTenant({ loyaltyEnabled: false, giftCardsEnabled: false, b2bEnabled: false })
    // useFetch caches by key across tests sharing the runtime app.
    clearNuxtData(STORE_SETTINGS_KEY)
  })

  it('offers the account pages in the boards\' order', async () => {
    setTenant({ loyaltyEnabled: true, giftCardsEnabled: true, b2bEnabled: true })
    state.loyalty = true

    expect(await keys()).toEqual([
      'overview', 'orders', 'addresses', 'favourites', 'reviews', 'notifications',
      'rewards', 'gift_cards', 'business', 'newsletter', 'profile', 'security', 'privacy',
    ])
  })

  it('links each page in the current locale', async () => {
    const { items } = await navigation()

    expect(items.value.find(item => item.key === 'orders')?.to).toBe(useLocalePath()('account-orders'))
  })

  it.each([
    ['favourites', 'FAVOURITES_ENABLED'],
    ['reviews', 'ACCOUNT_REVIEWS_ENABLED'],
    ['newsletter', 'NEWSLETTER_ENABLED'],
  ])('leaves out %s while the store switches %s off', async (key, setting) => {
    state.settings = { [setting]: 'False' }

    expect(await keys()).not.toContain(key)
  })

  it.each([
    ['rewards', { loyaltyEnabled: true }, () => { state.loyalty = true }],
    ['gift_cards', { giftCardsEnabled: true }, () => {}],
    ['business', { b2bEnabled: true }, () => {}],
  ] as const)('offers %s only with both its plan flag and its switch on', async (key, plan, switchOn) => {
    expect(await keys()).not.toContain(key)

    setTenant(plan)
    switchOn()
    expect(await keys()).toContain(key)
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

  it('knows when the overview itself is on screen', async () => {
    expect((await navigation()).onOverview.value).toBe(true)

    state.route = 'account-orders___el'
    expect((await navigation()).onOverview.value).toBe(false)
  })

  it('counts unseen notifications beside their entry, and nothing when all are seen', async () => {
    state.unseen = 3
    const notifications = async () => (await navigation()).items.value.find(item => item.key === 'notifications')

    expect((await notifications())?.badge).toBe(3)

    state.unseen = 0
    expect((await notifications())?.badge).toBeUndefined()
  })
})
