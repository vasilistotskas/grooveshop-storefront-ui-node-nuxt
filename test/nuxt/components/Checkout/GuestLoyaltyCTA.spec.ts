import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import CheckoutGuestLoyaltyCTA from '~/components/Checkout/GuestLoyaltyCTA.vue'
import WebsideCheckoutGuestLoyaltyCTA from '~/components/variants/webside/Checkout/GuestLoyaltyCTA.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { makeLoyaltySettings } from '~~/test/fixtures/loyalty'
import { createLoyaltySettingsMock } from '~~/test/helpers/loyaltySettings'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * A guest's nudge to sign up: "earn N points on this order", with
 * N = floor(cart total × points factor). Shown only when the store has
 * the loyalty feature, and only for a positive estimate. The trees share the logic; the default reads
 * as a line of copy, the frozen webside copy carries a "+N" badge.
 */
const settings = createLoyaltySettingsMock(makeLoyaltySettings({ pointsFactor: 0.5 }))

mockNuxtImport('useLoyaltySettings', () => () => settings.use)

describe.each(trees(CheckoutGuestLoyaltyCTA, WebsideCheckoutGuestLoyaltyCTA))('$tree Checkout/GuestLoyaltyCTA', ({ tree, C }) => {
  beforeEach(() => {
    settings.reset()
    setTenant({ loyaltyEnabled: true })
    setTenantFeatures({ loyalty: true })
    useCartStore().cart = makeCart({ totalPrice: 49.9 })
  })

  const mount = () => mountSuspended(C, { route: false })

  it('estimates the points, rounding down, and links to sign-up', async () => {
    const wrapper = await mount()

    // floor(49.9 × 0.5)
    expect(wrapper.text()).toContain(tree === 'default'
      ? 'Κέρδισε 24 πόντους με αυτή την παραγγελία'
      : '+24Κέρδισε 24 πόντους με αυτήν την παραγγελία!')
    expect(wrapper.find('a').attributes('href')).toBe('/account/signup')
  })

  it.each([
    { case: 'the store has no loyalty', arrange: () => { setTenant({ loyaltyEnabled: false, features: { ...useTenantStore().config!.features, loyalty: false } }) } },
    { case: 'the merchant switched it off', arrange: () => { setTenantFeatures({ loyalty: false }) } },
    { case: 'the settings cannot be read', arrange: () => { settings.data.value = null } },
    { case: 'the estimate rounds to zero', arrange: () => { useCartStore().cart = makeCart({ totalPrice: 1.5 }) } },
    { case: 'there is no cart', arrange: () => { useCartStore().cart = null } },
  ])('renders nothing when $case', async ({ arrange }) => {
    arrange()

    const wrapper = await mount()

    expect(wrapper.text()).toBe('')
  })

  it('decides from the feature alone: shown while the plan flag is off', async () => {
    setTenant({ loyaltyEnabled: false })
    setTenantFeatures({ loyalty: true })

    const wrapper = await mount()

    expect(wrapper.text()).toContain('Κέρδισε 24 πόντους')
  })
})
