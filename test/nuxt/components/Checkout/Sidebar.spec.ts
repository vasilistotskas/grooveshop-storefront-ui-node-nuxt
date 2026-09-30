import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import CheckoutSidebar from '~/components/Checkout/Sidebar.vue'
import WebsideCheckoutSidebar from '~/components/variants/webside/Checkout/Sidebar.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import type { CartOverrides } from '~~/test/fixtures/cart'
import { makePayWay } from '~~/test/fixtures/payWay'
import type { PayWay } from '~~/shared/openapi/types.gen'
import { trees } from '~~/test/helpers/trees'

/**
 * The checkout sidebar is the only place the shopper sees what they
 * will pay before they pay it. Promotions arrive computed on the cart;
 * the sidebar derives the rest — shipping, the pay-way fee and its free
 * threshold, loyalty, and the gift-card preview — so a slip here shows
 * a total the order-create call then contradicts.
 *
 * Both trees carry the same `<script>`; the webside copy differs only
 * in text colours, the `Webside` child prefix and its Greek-only
 * `<i18n>` block.
 */

const HOME = { method: 'home_delivery' as const }

const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

function setCart(overrides: CartOverrides) {
  useCartStore().cart = makeCart(overrides)
}

function setPayWay(payWay: PayWay | null) {
  useState<PayWay | null>('selectedPayWay').value = payWay
}

/** The amount printed beside the row whose label is exactly `label`, or `null` when there is no such row. */
function amountBeside(wrapper: VueWrapper, label: string): string | null {
  const labelEl = wrapper.findAll('span').find(span => span.text() === label)
  if (!labelEl) return null
  return labelEl.element.nextElementSibling?.textContent?.trim() ?? null
}

describe.each(trees(CheckoutSidebar, WebsideCheckoutSidebar))('$tree Checkout/Sidebar', ({ C }) => {
  const mount = (props: Record<string, unknown> = {}) =>
    mountSuspended(C, { route: false, props: { shippingPrice: null, ...props } })

  beforeEach(() => {
    setCart({ totalPrice: 60 })
    setPayWay(null)
  })

  it('totals the cart, the shipping, the fee and the discounts', async () => {
    setCart({
      totalPrice: 100,
      promotionDiscount: 10,
      appliedPromotions: [{ promotionId: 1, name: 'Φθινόπωρο', code: null, amount: 10 }],
    })
    setPayWay(makePayWay({ cost: 2 }))

    const wrapper = await mount({
      shippingPrice: 5,
      shippingSummary: HOME,
      showPaymentFee: true,
      loyaltyDiscount: 7,
    })

    // 100 − 10 promotion + 5 shipping + 2 fee − 7 points
    expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(90))
    expect(amountBeside(wrapper, 'Μεταφορικά')).toBe(money(5))
    expect(amountBeside(wrapper, 'Φθινόπωρο')).toBe(`-${money(10)}`)
    expect(amountBeside(wrapper, 'Έκπτωση πόντων')).toBe(`-${money(7)}`)
  })

  it('leaves shipping out of the total until a method is chosen', async () => {
    const wrapper = await mount({ shippingPrice: 5 })

    expect(amountBeside(wrapper, 'Μεταφορικά')).toBeNull()
    expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(60))
  })

  it('shows a dash and adds nothing while the chosen method is not priced yet', async () => {
    const wrapper = await mount({ shippingPrice: null, shippingSummary: HOME })

    expect(amountBeside(wrapper, 'Μεταφορικά')).toBe('—')
    expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(60))
  })

  it('waives the shipping price when a promotion grants free shipping', async () => {
    setCart({ totalPrice: 60, promotionFreeShipping: true })

    const wrapper = await mount({ shippingPrice: 5, shippingSummary: HOME })

    expect(amountBeside(wrapper, 'Μεταφορικά')).toBe('Δωρεάν')
    expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(60))
  })

  describe('pay-way fee', () => {
    it('adds the fee on a row named after the pay way', async () => {
      setPayWay(makePayWay({ cost: 2.5 }))

      const wrapper = await mount({ showPaymentFee: true })

      expect(amountBeside(wrapper, 'Αντικαταβολή')).toBe(money(2.5))
      expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(62.5))
    })

    it('neither shows nor charges the fee on steps that hide it', async () => {
      setPayWay(makePayWay({ cost: 2.5 }))

      const wrapper = await mount({ showPaymentFee: false })

      expect(amountBeside(wrapper, 'Αντικαταβολή')).toBeNull()
      expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(60))
    })

    /**
     * The threshold is compared with what the shopper actually owes for
     * the goods: the cart AFTER promotions, plus shipping. Comparing the
     * undiscounted cart waived the fee on orders under the threshold.
     */
    it.each([
      { case: 'the undiscounted cart reaches the threshold', totalPrice: 60, promotionDiscount: 0, shipping: 0, total: 60 },
      { case: 'a promotion takes the cart below it', totalPrice: 60, promotionDiscount: 15, shipping: 0, total: 47 },
      { case: 'shipping lifts the discounted cart back to it', totalPrice: 60, promotionDiscount: 15, shipping: 5, total: 50 },
    ])('evaluates the free threshold on the discounted cart plus shipping: $case', async ({ totalPrice, promotionDiscount, shipping, total }) => {
      setCart({ totalPrice, promotionDiscount })
      setPayWay(makePayWay({ cost: 2, freeThreshold: 50 }))

      const wrapper = await mount({ shippingPrice: shipping, shippingSummary: HOME, showPaymentFee: true })

      expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(total))
    })
  })

  describe('gift cards', () => {
    /**
     * Mirrors Django's redemption plan: a card never covers more than is
     * due, and partial coverage leaves at least 0.50 € for the online
     * provider's minimum charge — the sliver stays on the card.
     */
    it.each([
      { case: 'covers the whole amount when the balance exceeds it', balance: 80, applied: 60, total: 0 },
      { case: 'keeps 0.50 € due when it would leave less than that', balance: 59.8, applied: 59.5, total: 0.5 },
      { case: 'applies the whole balance when at least 0.50 € stays due', balance: 59.5, applied: 59.5, total: 0.5 },
      { case: 'applies a small balance in full', balance: 20, applied: 20, total: 40 },
    ])('$case', async ({ balance, applied, total }) => {
      const wrapper = await mount({ giftCardBalance: balance })

      expect(amountBeside(wrapper, 'Δωροκάρτα')).toBe(`-${money(applied)}`)
      expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(total))
    })

    it('settles what is due after shipping, the fee and the discounts', async () => {
      setCart({ totalPrice: 60, promotionDiscount: 10 })
      setPayWay(makePayWay({ cost: 2 }))

      const wrapper = await mount({
        shippingPrice: 5,
        shippingSummary: HOME,
        showPaymentFee: true,
        loyaltyDiscount: 7,
        giftCardBalance: 100,
      })

      // due before the card: 60 − 10 + 5 + 2 − 7
      expect(amountBeside(wrapper, 'Δωροκάρτα')).toBe(`-${money(50)}`)
      expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(0))
    })

    it('shows no gift-card row without a balance', async () => {
      const wrapper = await mount({ giftCardBalance: 0 })

      expect(amountBeside(wrapper, 'Δωροκάρτα')).toBeNull()
    })
  })

  it('never shows a negative total when the points exceed what is due', async () => {
    const wrapper = await mount({ loyaltyDiscount: 75 })

    expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(0))
  })

  it('lists each applied offer with its coupon code, naming an unnamed one generically', async () => {
    setCart({
      totalPrice: 60,
      promotionDiscount: 8,
      appliedPromotions: [
        { promotionId: 1, name: 'Καλωσόρισμα', code: 'WELCOME', amount: 5 },
        { promotionId: 2, name: '', code: null, amount: 3 },
      ],
    })

    const wrapper = await mount()
    const text = wrapper.text()

    expect(text).toContain('WELCOME')
    expect(text).toContain(`-${money(5)}`)
    expect(text).toContain('Έκπτωση προσφοράς')
    expect(text).toContain(`-${money(3)}`)
    expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(52))
  })

  it.each([
    { b2bPricing: { applied: true, groupName: 'Επαγγελματίες' }, badge: 'Τιμές χονδρικής: Επαγγελματίες' },
    { b2bPricing: { applied: true, groupName: '' }, badge: 'Τιμές χονδρικής' },
  ])('says the prices are wholesale: $badge', async ({ b2bPricing, badge }) => {
    setCart({ totalPrice: 60, b2bPricing })

    const wrapper = await mount()

    expect(wrapper.text()).toContain(badge)
  })

  it('warns a wholesale cart below the minimum order value, with the minimum', async () => {
    setCart({ totalPrice: 60, b2bPricing: { applied: true, belowMinimum: true, minOrderValue: '150.00' } })

    const wrapper = await mount()

    expect(wrapper.text()).toContain(`Η ελάχιστη αξία παραγγελίας χονδρικής είναι ${money(150)}`)
  })

  it('recaps the chosen locker on the payment step', async () => {
    const wrapper = await mount({
      shippingPrice: 3,
      shippingSummary: {
        method: 'box_now_locker',
        lockerName: 'BOX NOW Σύνταγμα',
        lockerId: '42',
        lockerAddress: 'Πανεπιστημίου 10, 10671',
      },
    })
    const text = wrapper.text()

    expect(text).toContain('BOX NOW Locker')
    expect(text).toContain('BOX NOW Σύνταγμα')
    expect(text).toContain('ID 42')
    expect(text).toContain('Πανεπιστημίου 10, 10671')
  })

  it('counts the distinct products in the cart', async () => {
    setCart({ items: [{ id: 1 }, { id: 2, quantity: 3, product: { id: 2 } }] })

    const wrapper = await mount()

    expect(amountBeside(wrapper, 'Προϊόντα')).toBe('2')
  })
})
