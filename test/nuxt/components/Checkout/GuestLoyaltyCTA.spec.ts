import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CheckoutGuestLoyaltyCTA from '~/components/Checkout/GuestLoyaltyCTA.vue'
import WebsideCheckoutGuestLoyaltyCTA from '~/components/variants/webside/Checkout/GuestLoyaltyCTA.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * A guest's nudge to sign up: "earn N points on this order", N being each
 * line's `potentialPoints` by its quantity. Shown only when the store has
 * the loyalty feature, and only for a positive estimate. The trees share the logic; the default reads
 * as a line of copy, the webside copy carries a "+N" badge.
 */
/** Two lines that earn 24 in all: 7 × 2 and 10 × 1. */
const earningCart = () => makeCart({
  items: [
    { id: 1, quantity: 2, product: { id: 1, potentialPoints: 7 } },
    { id: 2, quantity: 1, product: { id: 2, potentialPoints: 10 } },
  ],
})

describe.each(trees(CheckoutGuestLoyaltyCTA, WebsideCheckoutGuestLoyaltyCTA))('$tree Checkout/GuestLoyaltyCTA', ({ tree, C }) => {
  beforeEach(() => {
    setTenant({ loyaltyEnabled: true })
    setTenantFeatures({ loyalty: true })
    useCartStore().cart = earningCart()
  })

  const mount = () => mountSuspended(C, { route: false })

  it('adds up what the lines earn, and links to sign-up', async () => {
    const wrapper = await mount()

    expect(wrapper.text()).toContain(tree === 'default'
      ? 'Κέρδισε 24 πόντους με αυτή την παραγγελία'
      : '+24Κέρδισε 24 πόντους με αυτήν την παραγγελία!')
    // And back to the page it is on once signed up (here `/`).
    expect(wrapper.find('a').attributes('href')).toBe('/account/signup?next=/')
  })

  it.each([
    { case: 'the store has no loyalty', arrange: () => { setTenant({ loyaltyEnabled: false, features: { ...useTenantStore().config!.features, loyalty: false } }) } },
    { case: 'the merchant switched it off', arrange: () => { setTenantFeatures({ loyalty: false }) } },
    { case: 'the lines earn nothing', arrange: () => { useCartStore().cart = makeCart() } },
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
