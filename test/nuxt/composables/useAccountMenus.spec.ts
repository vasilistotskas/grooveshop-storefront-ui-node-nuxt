import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

let mockEnabledValue = false
let mockLoyaltyEnabled = false

mockNuxtImport('useNuxtApp', () => () => ({
  $i18n: { t: (key: string) => key },
}))

mockNuxtImport('useAuthPreviewMode', () => {
  return () => ({
    enabled: { value: mockEnabledValue },
  })
})

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

describe('useAccountMenus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnabledValue = false
    mockLoyaltyEnabled = false
  })

  it('should return basic menu items when preview mode is disabled', () => {
    const { menus } = useAccountMenus()

    expect(menus.value).toHaveLength(4)
    expect(menus.value[0]!.route?.name).toBe('account')
    expect(menus.value[1]!.route?.name).toBe('account-favourites-posts')
    expect(menus.value[2]!.route?.name).toBe('account-subscriptions')
    expect(menus.value[3]!.route?.name).toBe('account-settings')
  })

  it('should include all menu items when preview mode is enabled', () => {
    mockEnabledValue = true

    const { menus } = useAccountMenus()

    expect(menus.value).toHaveLength(8)
    const routeNames = menus.value.map(m => m.route?.name)
    expect(routeNames).toContain('account')
    expect(routeNames).toContain('account-addresses')
    expect(routeNames).toContain('account-orders')
    expect(routeNames).toContain('account-reviews')
    expect(routeNames).toContain('account-help')
  })

  it('should have correct route paths for basic menus', () => {
    const { menus } = useAccountMenus()

    expect(menus.value[0]!.route?.path).toBe('/account')
    expect(menus.value[1]!.route?.path).toBe('/account/favourites/posts')
    expect(menus.value[2]!.route?.path).toBe('/account/subscriptions')
    expect(menus.value[3]!.route?.path).toBe('/account/settings')
  })

  it('should have correct icons for menu items', () => {
    const { menus } = useAccountMenus()

    expect(menus.value[0]!.icon).toBe('i-heroicons-user')
    expect(menus.value[1]!.icon).toBe('i-mdi-heart-outline')
    expect(menus.value[2]!.icon).toBe('i-heroicons-bell')
    expect(menus.value[3]!.icon).toBe('i-mdi-cog-outline')
  })

  it('should have type link for all menu items', () => {
    const { menus } = useAccountMenus()

    menus.value.forEach((menu) => {
      expect(menu.type).toBe('link')
    })
  })

  it('should have correct route names', () => {
    const { menus } = useAccountMenus()

    expect(menus.value[0]!.route?.name).toBe('account')
    expect(menus.value[1]!.route?.name).toBe('account-favourites-posts')
    expect(menus.value[2]!.route?.name).toBe('account-subscriptions')
    expect(menus.value[3]!.route?.name).toBe('account-settings')
  })

  it('should add preview mode menus with correct paths', () => {
    mockEnabledValue = true

    const { menus } = useAccountMenus()

    const addressMenu = menus.value.find(m => m.route?.name === 'account-addresses')
    const ordersMenu = menus.value.find(m => m.route?.name === 'account-orders')
    const reviewsMenu = menus.value.find(m => m.route?.name === 'account-reviews')
    const helpMenu = menus.value.find(m => m.route?.name === 'account-help')

    expect(addressMenu?.route?.path).toBe('/account/addresses')
    expect(ordersMenu?.route?.path).toBe('/account/orders')
    expect(reviewsMenu?.route?.path).toBe('/account/reviews')
    expect(helpMenu?.route?.path).toBe('/account/help')
  })
})
