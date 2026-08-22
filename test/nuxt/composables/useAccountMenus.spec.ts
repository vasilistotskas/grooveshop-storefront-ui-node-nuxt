import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'

let mockLoyaltyEnabled = false
// The "My reviews" entry is gated on the per-tenant extra-setting
// ACCOUNT_REVIEWS_ENABLED (store preference, editable by the store
// operator) — no longer on the superuser-only preview mode, which only
// ever hid the link while the route stayed reachable by URL.
let mockReviewsSettingValue = 'true'

registerEndpoint('/api/settings/get', () => ({
  value: mockReviewsSettingValue,
}))

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
    mockLoyaltyEnabled = false
    mockReviewsSettingValue = 'true'
    // useFetch caches by key across tests sharing the runtime app.
    clearNuxtData('account-menus:reviews-enabled')
  })

  it('includes the reviews entry by default (setting defaults to true)', async () => {
    const { menus } = useAccountMenus()
    await nextTick()

    const paths = menus.value.map(m => m.to)
    expect(paths).toContain('/account/reviews')
    expect(menus.value).toHaveLength(8)
  })

  it('hides the reviews entry when the store disabled it', async () => {
    mockReviewsSettingValue = 'False'

    const { menus } = useAccountMenus()
    await vi.waitFor(() => {
      expect(menus.value.map(m => m.to)).not.toContain('/account/reviews')
    })
    expect(menus.value).toHaveLength(7)
  })

  it('never offers the deleted help page', () => {
    const { menus } = useAccountMenus()

    expect(menus.value.map(m => m.to)).not.toContain('/account/help')
  })

  it('should have correct paths for basic menus', () => {
    const { menus } = useAccountMenus()

    expect(menus.value[0]!.to).toBe('/account')
    expect(menus.value[1]!.to).toBe('/account/orders')
    expect(menus.value[2]!.to).toBe('/account/favourites/posts')
    expect(menus.value[3]!.to).toBe('/account/notifications')
    expect(menus.value[4]!.to).toBe('/account/subscriptions')
    expect(menus.value[5]!.to).toBe('/account/addresses')
    expect(menus.value[6]!.to).toBe('/account/settings')
  })

  it('should have correct icons for menu items', () => {
    const { menus } = useAccountMenus()

    expect(menus.value[0]!.icon).toBe('i-heroicons-user')
    expect(menus.value[1]!.icon).toBe('i-mdi-package-variant-closed')
    expect(menus.value[2]!.icon).toBe('i-mdi-heart-outline')
    expect(menus.value[3]!.icon).toBe('i-heroicons-bell')
    expect(menus.value[4]!.icon).toBe('i-heroicons-envelope')
    expect(menus.value[5]!.icon).toBe('i-fa6-solid-address-book')
    expect(menus.value[6]!.icon).toBe('i-mdi-cog-outline')
  })

  it('should have labels for all menu items', () => {
    const { menus } = useAccountMenus()

    menus.value.forEach((menu) => {
      expect(menu.label).toBeTruthy()
    })
  })

  it('includes loyalty only when both gates pass', async () => {
    mockLoyaltyEnabled = true

    const { menus } = useAccountMenus()
    await nextTick()

    // tenantStore.loyaltyEnabled is false in the bare test store, so
    // the runtime toggle alone must not surface the entry.
    expect(menus.value.map(m => m.to)).not.toContain('/account/loyalty')
  })
})
