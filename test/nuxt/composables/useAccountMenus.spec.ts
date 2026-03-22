import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

let mockEnabledValue = false
let mockLoyaltyEnabled = false

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
    expect(menus.value[0]!.to).toBe('/account')
    expect(menus.value[1]!.to).toBe('/account/favourites/posts')
    expect(menus.value[2]!.to).toBe('/account/subscriptions')
    expect(menus.value[3]!.to).toBe('/account/settings')
  })

  it('should include all menu items when preview mode is enabled', () => {
    mockEnabledValue = true

    const { menus } = useAccountMenus()

    expect(menus.value).toHaveLength(8)
    const paths = menus.value.map(m => m.to)
    expect(paths).toContain('/account')
    expect(paths).toContain('/account/addresses')
    expect(paths).toContain('/account/orders')
    expect(paths).toContain('/account/reviews')
    expect(paths).toContain('/account/help')
  })

  it('should have correct paths for basic menus', () => {
    const { menus } = useAccountMenus()

    expect(menus.value[0]!.to).toBe('/account')
    expect(menus.value[1]!.to).toBe('/account/favourites/posts')
    expect(menus.value[2]!.to).toBe('/account/subscriptions')
    expect(menus.value[3]!.to).toBe('/account/settings')
  })

  it('should have correct icons for menu items', () => {
    const { menus } = useAccountMenus()

    expect(menus.value[0]!.icon).toBe('i-heroicons-user')
    expect(menus.value[1]!.icon).toBe('i-mdi-heart-outline')
    expect(menus.value[2]!.icon).toBe('i-heroicons-bell')
    expect(menus.value[3]!.icon).toBe('i-mdi-cog-outline')
  })

  it('should have labels for all menu items', () => {
    const { menus } = useAccountMenus()

    menus.value.forEach((menu) => {
      expect(menu.label).toBeTruthy()
    })
  })

  it('should add preview mode menus with correct paths', () => {
    mockEnabledValue = true

    const { menus } = useAccountMenus()

    const addressMenu = menus.value.find(m => m.to === '/account/addresses')
    const ordersMenu = menus.value.find(m => m.to === '/account/orders')
    const reviewsMenu = menus.value.find(m => m.to === '/account/reviews')
    const helpMenu = menus.value.find(m => m.to === '/account/help')

    expect(addressMenu).toBeDefined()
    expect(ordersMenu).toBeDefined()
    expect(reviewsMenu).toBeDefined()
    expect(helpMenu).toBeDefined()
  })
})
