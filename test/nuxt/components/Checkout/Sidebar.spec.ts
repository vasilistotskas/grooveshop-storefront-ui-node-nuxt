import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import CheckoutSidebar from '~/components/Checkout/Sidebar.vue'
import WebsideCheckoutSidebar from '~/components/variants/webside/Checkout/Sidebar.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import type { CartOverrides } from '~~/test/fixtures/cart'
import { makePayWay } from '~~/test/fixtures/payWay'
import type { PayWay } from '~~/shared/openapi/types.gen'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The checkout's order summary is the only place the shopper sees what
 * they will pay before they pay it. The default tree prints the figures
 * `useCheckoutTotals` computes (its own suite holds the arithmetic); the
 * frozen webside copy still computes them inline, so its suite keeps the
 * arithmetic cases.
 */

const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

function setCart(overrides: CartOverrides) {
  useCartStore().cart = makeCart(overrides)
}

function setPayWay(payWay: PayWay | null) {
  useState<PayWay | null>('selectedPayWay').value = payWay
}

describe('Checkout/Sidebar (default)', () => {
  const messages = YAML.parse(
    parseSfc(resolve(REPO, 'app/components/Checkout/Sidebar.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
  ).el

  const mount = (props: Record<string, unknown> = {}, slots: Record<string, string> = {}) =>
    mountSuspended(CheckoutSidebar, {
      route: false,
      props: {
        shippingPrice: null,
        includeShipping: false,
        showPaymentFee: false,
        loyalty: null,
        giftCardBalance: 0,
        ...props,
      },
      slots,
    })

  /** The charge printed beside the row whose term is exactly `label`, or `null` when there is no such row. */
  function charge(wrapper: VueWrapper, label: string): string | null {
    const term = wrapper.findAll('dt').find(dt => dt.text() === label)
    return term?.element.nextElementSibling?.textContent?.trim() ?? null
  }

  const total = (wrapper: VueWrapper) =>
    wrapper.findAll('span').find(span => span.text() === messages.total)!.element.nextElementSibling!.textContent!.trim()

  beforeEach(() => {
    setCart({ totalPrice: 60 })
    setPayWay(null)
  })

  it('prints every charge and the total they come to', async () => {
    setCart({
      totalPrice: 100,
      promotionDiscount: 10,
      appliedPromotions: [{ promotionId: 1, name: 'Φθινόπωρο', code: null, amount: 10 }],
    })
    setPayWay(makePayWay({ cost: 2 }))

    const wrapper = await mount({
      shippingPrice: 5,
      includeShipping: true,
      showPaymentFee: true,
      loyalty: { amount: 7, points: 700 },
      giftCardBalance: 20,
    })

    expect(charge(wrapper, messages.subtotal)).toBe(money(100))
    expect(charge(wrapper, 'Φθινόπωρο')).toBe(`−${money(10)}`)
    expect(charge(wrapper, messages.loyalty_discount.replace('{points}', useNuxtApp().$i18n.n(700)))).toBe(`−${money(7)}`)
    expect(charge(wrapper, messages.gift_card)).toBe(`−${money(20)}`)
    expect(charge(wrapper, messages.shipping)).toBe(money(5))
    expect(charge(wrapper, 'Αντικαταβολή')).toBe(money(2))
    // 100 − 10 + 5 + 2 − 7 − 20
    expect(total(wrapper)).toBe(money(70))
  })

  it('names a coupon by its code and an unnamed offer generically', async () => {
    setCart({
      totalPrice: 60,
      promotionDiscount: 8,
      appliedPromotions: [
        { promotionId: 1, name: 'Καλωσόρισμα', code: 'WELCOME', amount: 5 },
        { promotionId: 2, name: '', code: null, amount: 3 },
      ],
    })

    const wrapper = await mount()

    expect(charge(wrapper, messages.coupon.replace('{code}', 'WELCOME'))).toBe(`−${money(5)}`)
    expect(charge(wrapper, messages.promotion_discount)).toBe(`−${money(3)}`)
    expect(total(wrapper)).toBe(money(52))
  })

  describe('delivery', () => {
    it('says it is calculated next until a method is chosen', async () => {
      const wrapper = await mount({ shippingPrice: 5, includeShipping: false })

      expect(charge(wrapper, messages.shipping)).toBe(messages.calculated_next)
      expect(total(wrapper)).toBe(money(60))
    })

    it('shows a dash while the chosen method is not priced yet', async () => {
      const wrapper = await mount({ shippingPrice: null, includeShipping: true })

      expect(charge(wrapper, messages.shipping)).toBe('—')
    })

    it('says it is free when a promotion waives it', async () => {
      setCart({ totalPrice: 60, promotionFreeShipping: true })

      const wrapper = await mount({ shippingPrice: 5, includeShipping: true })

      expect(charge(wrapper, messages.shipping)).toBe(messages.free)
    })
  })

  describe('pay-way fee', () => {
    it('shows no fee row before the payment page', async () => {
      setPayWay(makePayWay({ cost: 2.5 }))

      const wrapper = await mount({ showPaymentFee: false })

      expect(charge(wrapper, 'Αντικαταβολή')).toBeNull()
    })

    // parler allows a blank name per locale; the row then says what it
    // is generically, in the page's language.
    it('labels the fee generically for a pay way with no name in this language', async () => {
      setPayWay(makePayWay({
        cost: 2.5,
        translations: {
          el: { name: '', description: '', instructions: '' },
          en: { name: 'Cash on delivery', description: '', instructions: '' },
        },
      }))

      const wrapper = await mount({ showPaymentFee: true })

      expect(charge(wrapper, messages.pay_way_fee)).toBe(money(2.5))
    })
  })

  it('lists each free gift as a free row', async () => {
    setCart({
      totalPrice: 60,
      promotionGiftItems: [{ promotionId: 4, name: 'Δώρο καλωσορίσματος', productId: 9, productName: 'Κούπα', productImagePath: '', quantity: 1 }],
    })

    const wrapper = await mount()

    expect(wrapper.find('dl').text()).toContain('Κούπα')
  })

  it('states the VAT the total holds', async () => {
    setCart({ totalPrice: 60, totalVatValue: 11.61 })

    const wrapper = await mount()

    expect(wrapper.text()).toContain(messages.vat_items.replace('{amount}', money(11.61)))
  })

  it('links back to the cart to edit the order', async () => {
    const wrapper = await mount()

    const edit = wrapper.findAll('a').find(a => a.text() === messages.edit)
    expect(edit?.attributes('href')).toBe('/cart')
  })

  it('renders the fields the page puts in', async () => {
    const wrapper = await mount({}, {
      'items': '<p data-slot-name="items" />',
      'coupon': '<p data-slot-name="coupon" />',
      'gift-card': '<p data-slot-name="gift-card" />',
      'loyalty': '<p data-slot-name="loyalty" />',
      'points-earned': '<p data-slot-name="points-earned" />',
    })

    expect(wrapper.findAll('[data-slot-name]').map(el => el.attributes('data-slot-name')))
      .toEqual(['items', 'coupon', 'gift-card', 'loyalty', 'points-earned'])
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
})

describe('Checkout/Sidebar (frozen webside)', () => {
  const HOME = { method: 'home_delivery' as const }

  const mount = (props: Record<string, unknown> = {}) =>
    mountSuspended(WebsideCheckoutSidebar, { route: false, props: { shippingPrice: null, ...props } })

  /** The amount printed beside the row whose label is exactly `label`, or `null` when there is no such row. */
  function amountBeside(wrapper: VueWrapper, label: string): string | null {
    const labelEl = wrapper.findAll('span').find(span => span.text() === label)
    if (!labelEl) return null
    return labelEl.element.nextElementSibling?.textContent?.trim() ?? null
  }

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

    it('labels the fee generically for a pay way with no name in this language', async () => {
      setPayWay(makePayWay({
        cost: 2.5,
        translations: {
          el: { name: '', description: '', instructions: '' },
          en: { name: 'Cash on delivery', description: '', instructions: '' },
        },
      }))

      const wrapper = await mount({ showPaymentFee: true })

      expect(amountBeside(wrapper, 'Προμήθεια Τρόπου πληρωμής')).toBe(money(2.5))
    })

    it('neither shows nor charges the fee on steps that hide it', async () => {
      setPayWay(makePayWay({ cost: 2.5 }))

      const wrapper = await mount({ showPaymentFee: false })

      expect(amountBeside(wrapper, 'Αντικαταβολή')).toBeNull()
      expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(60))
    })

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
    expect(text).toContain('Έκπτωση προσφοράς')
    expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(52))
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
