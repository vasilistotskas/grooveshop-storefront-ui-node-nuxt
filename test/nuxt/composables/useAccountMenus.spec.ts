import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { setTenant } from '~~/test/helpers/tenant'

let mockLoyaltyEnabled = false
// Menu entries are gated on per-tenant extra-settings read through
// useSettingFlag off the ONE public-settings payload — every gated key
// is served enabled unless a test overrides it, so disabling one flag
// never disables the others with it.
let mockSettingValues: Record<string, string> = {}

const SETTING_FLAG_KEYS = [
  'ACCOUNT_REVIEWS_ENABLED',
  'FAVOURITES_ENABLED',
  'NEWSLETTER_ENABLED',
  'GIFT_CARDS_ENABLED',
  'B2B_WHOLESALE_ENABLED',
]

const servedSettings = () => Object.fromEntries(
  SETTING_FLAG_KEYS.map(key => [key, mockSettingValues[key] ?? 'True']),
)

registerEndpoint('/api/settings/public', () => ({ settings: servedSettings() }))

mockNuxtImport('useLoyalty', () => {
  return () => ({
    fetchSettings: () => ({
      data: computed(() => ({
        enabled: mockLoyaltyEnabled,
        redemptionRatioEur: 100,
        pointsFactor: 1.0,
        tierMultiplierEnabled: false,
        pointsExpirationDays: 0,
        newCustomerBonusEnabled: false,
        newCustomerBonusPoints: 0,
        xpPerLevel: 1000,
      })),
    }),
  })
})

/**
 * The menu once the store's settings have landed — before that every
 * flag is on its fallback, and an assertion there passes for the wrong
 * reason.
 */
async function loadedMenus() {
  const { menus } = useAccountMenus()
  const { settings } = useStoreSettings()
  await vi.waitFor(() => expect(settings.value).toEqual(servedSettings()), { interval: 1 })
  return menus
}

const pathsOf = async () => (await loadedMenus()).value.map(m => m.to)

describe('useAccountMenus', () => {
  beforeEach(() => {
    mockLoyaltyEnabled = false
    mockSettingValues = {}
    setTenant()
    // useFetch caches by key across tests sharing the runtime app.
    clearNuxtData(STORE_SETTINGS_KEY)
  })

  it('lists the base account pages in order, translated, with settings last and reviews after it', async () => {
    const menus = await loadedMenus()
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
    ['ACCOUNT_REVIEWS_ENABLED', '/account/reviews'],
    ['FAVOURITES_ENABLED', '/account/favourites/posts'],
    ['NEWSLETTER_ENABLED', '/account/subscriptions'],
  ])('hides the entry the store switched off with %s', async (key, path) => {
    mockSettingValues = { [key]: 'False' }

    const paths = await pathsOf()

    expect(paths).not.toContain(path)
    expect(paths).toContain('/account/orders')
  })

  it('never offers the deleted help page', async () => {
    expect(await pathsOf()).not.toContain('/account/help')
  })

  describe.each([
    {
      entry: 'loyalty',
      path: '/account/loyalty',
      plan: { loyaltyEnabled: true },
      runtimeOn: () => { mockLoyaltyEnabled = true },
      runtimeOff: () => { mockLoyaltyEnabled = false },
    },
    {
      entry: 'gift cards',
      path: '/account/gift-cards',
      plan: { giftCardsEnabled: true },
      runtimeOn: () => {},
      runtimeOff: () => { mockSettingValues = { GIFT_CARDS_ENABLED: 'False' } },
    },
    {
      entry: 'business account',
      path: '/account/business',
      plan: { b2bEnabled: true },
      runtimeOn: () => {},
      runtimeOff: () => { mockSettingValues = { B2B_WHOLESALE_ENABLED: 'False' } },
    },
  ])('the $entry entry (tenant plan AND runtime toggle)', ({ path, plan, runtimeOn, runtimeOff }) => {
    it('shows, just before settings, when both gates pass', async () => {
      setTenant(plan)
      runtimeOn()

      const paths = await pathsOf()

      expect(paths).toContain(path)
      expect(paths.indexOf(path)).toBe(paths.indexOf('/account/settings') - 1)
    })

    it('stays hidden on the plan alone', async () => {
      setTenant(plan)
      runtimeOff()

      expect(await pathsOf()).not.toContain(path)
    })

    it('stays hidden on the runtime toggle alone', async () => {
      runtimeOn()

      expect(await pathsOf()).not.toContain(path)
    })
  })
})
