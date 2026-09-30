import { beforeEach, describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import CheckoutGuestLoyaltyCTA from '~/components/Checkout/GuestLoyaltyCTA.vue'
import WebsideCheckoutGuestLoyaltyCTA from '~/components/variants/webside/Checkout/GuestLoyaltyCTA.vue'
import { useCartStore } from '~/stores/cart'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'
import { makeCart } from '~~/test/fixtures/cart'
import { makeLoyaltySettings } from '~~/test/fixtures/loyalty'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * A guest's nudge to sign up: "earn N points on this order", with
 * N = floor(cart total × points factor). Shown only when the tenant's
 * plan includes loyalty AND the merchant has it switched on, and only
 * for a positive estimate. The trees differ only in the `en:` block.
 */
const settings = createAsyncDataMock<LoyaltySettings>(makeLoyaltySettings({ pointsFactor: 0.5 }))

mockNuxtImport('useLoyalty', () => () => ({ fetchSettings: () => settings }))

describe.each(trees(CheckoutGuestLoyaltyCTA, WebsideCheckoutGuestLoyaltyCTA))('$tree Checkout/GuestLoyaltyCTA', ({ C }) => {
  beforeEach(() => {
    settings.reset()
    setTenant({ loyaltyEnabled: true })
    useCartStore().cart = makeCart({ totalPrice: 49.9 })
  })

  const mount = () => mountSuspended(C, { route: false })

  it('estimates the points, rounding down, and links to sign-up', async () => {
    const wrapper = await mount()

    // floor(49.9 × 0.5)
    expect(wrapper.text()).toContain('+24')
    expect(wrapper.text()).toContain('Κέρδισε 24 πόντους με αυτήν την παραγγελία!')
    expect(wrapper.find('a').attributes('href')).toBe('/account/signup')
  })

  it.each([
    { case: 'the plan has no loyalty', arrange: () => { setTenant({ loyaltyEnabled: false }) } },
    { case: 'the merchant switched it off', arrange: () => { settings.data.value = makeLoyaltySettings({ enabled: false, pointsFactor: 0.5 }) } },
    { case: 'the settings have not loaded', arrange: () => { settings.data.value = undefined } },
    { case: 'the estimate rounds to zero', arrange: () => { useCartStore().cart = makeCart({ totalPrice: 1.5 }) } },
    { case: 'there is no cart', arrange: () => { useCartStore().cart = null } },
  ])('renders nothing when $case', async ({ arrange }) => {
    arrange()

    const wrapper = await mount()

    expect(wrapper.text()).toBe('')
  })
})
