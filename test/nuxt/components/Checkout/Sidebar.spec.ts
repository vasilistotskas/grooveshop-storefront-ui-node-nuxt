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
import { makeCartQuote, unpricedQuote } from '~~/test/fixtures/checkoutQuote'
import { makePayWay } from '~~/test/fixtures/payWay'
import type { PayWay } from '~~/shared/openapi/types.gen'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'
import { componentTexts } from '~~/test/helpers/componentTexts'
import websideSidebarSource from '~/components/variants/webside/Checkout/Sidebar.vue?raw'

/**
 * The checkout's order summary is the only place the shopper sees what
 * they will pay before they pay it. Both trees print Django's quote as
 * it came, row by row, and its amount due as the total: nothing is added
 * up here (Django's own suites hold the arithmetic: waivers, caps, the
 * gift-card minimum). The webside copy shows the delivery only on the
 * payment step, where it recaps the chosen method.
 */

const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

function setCart(overrides: CartOverrides) {
  useCartStore().cart = makeCart(overrides)
}

function setPayWay(payWay: PayWay | null) {
  useState<PayWay | null>('selectedPayWay').value = payWay
}

/** A quote of every row: 100 of products, an offer, delivery, a fee, points and a gift card. */
/** The choices FULL_QUOTE priced: cash on delivery (pay way 1) and 700 points. */
const PRICED_FOR = { payWayId: 1, loyaltyPointsToRedeem: 700 }
const FULL_QUOTE = makeCartQuote({
  itemsSubtotal: 100,
  discountTotal: 10,
  appliedPromotions: [{ promotionId: 1, name: 'Φθινόπωρο', code: null, amount: 10 }],
  freeThresholdValue: 90,
  shipping: { price: 5, waivedBy: null },
  paymentMethodFee: { amount: 2, waived: false },
  loyaltyDiscount: 7,
  giftCardAmount: 20,
  grandTotal: 97,
  // Display-only: not the sum of the rows (that would be 70), so a summary
  // that added them up instead of printing Django's amount due fails.
  amountDue: 68.5,
  expectedTotal: { amount: 6850, currency: 'EUR' },
  payWays: [{ id: 1, key: 'PAY_ON_DELIVERY', fee: 2, waived: false }],
})

describe('Checkout/Sidebar (default)', () => {
  const messages = YAML.parse(
    parseSfc(resolve(REPO, 'app/components/Checkout/Sidebar.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
  ).el

  const mount = (props: Record<string, unknown> = {}, slots: Record<string, string> = {}) =>
    mountSuspended(CheckoutSidebar, {
      route: false,
      props: {
        quote: unpricedQuote(),
        includeShipping: false,
        quotedFor: null,
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

  it('prints every row of the quote and its amount due as the total', async () => {
    setPayWay(makePayWay({ cost: 2 }))

    const wrapper = await mount({ quote: FULL_QUOTE, includeShipping: true, quotedFor: PRICED_FOR })

    expect(charge(wrapper, messages.subtotal)).toBe(money(100))
    expect(charge(wrapper, 'Φθινόπωρο')).toBe(`−${money(10)}`)
    expect(charge(wrapper, messages.loyalty_discount.replace('{points}', useNuxtApp().$i18n.n(700)))).toBe(`−${money(7)}`)
    expect(charge(wrapper, messages.gift_card)).toBe(`−${money(20)}`)
    expect(charge(wrapper, messages.shipping)).toBe(money(5))
    expect(charge(wrapper, 'Αντικαταβολή')).toBe(money(2))
    // Django's amount due, not a sum of the rows above.
    expect(total(wrapper)).toBe(money(68.5))
  })

  it('names a coupon by its code and an unnamed offer generically', async () => {
    const wrapper = await mount({
      quote: unpricedQuote({
        appliedPromotions: [
          { promotionId: 1, name: 'Καλωσόρισμα', code: 'WELCOME', amount: 5 },
          { promotionId: 2, name: '', code: null, amount: 3 },
        ],
      }),
    })

    expect(charge(wrapper, messages.coupon.replace('{code}', 'WELCOME'))).toBe(`−${money(5)}`)
    expect(charge(wrapper, messages.promotion_discount)).toBe(`−${money(3)}`)
  })

  it('leaves the total to the payment step until the quote prices the delivery and the pay way', async () => {
    const wrapper = await mount({ quote: unpricedQuote({ shipping: { price: 5, waivedBy: null } }), includeShipping: true })

    expect(charge(wrapper, messages.shipping)).toBe(money(5))
    expect(total(wrapper)).toBe(messages.calculated_at_payment)
  })

  it('says why, where the total would be, when Django refuses the quote, and asks again on request', async () => {
    const wrapper = await mount({ quote: null, quoteRefusal: 'Ο τρόπος πληρωμής δεν είναι διαθέσιμος.' })

    await wrapper.findAll('button').find(button => button.text() === messages.retry_quote)!.trigger('click')
    expect(wrapper.emitted('retry-quote')).toHaveLength(1)
    expect(total(wrapper)).toBe('—')
    expect(wrapper.get('[role="status"]').text())
      .toBe(messages.quote_refused.replace('{reason}', 'Ο τρόπος πληρωμής δεν είναι διαθέσιμος.'))
  })

  it('shows dashes, not zeros, before the first quote arrives', async () => {
    const wrapper = await mount({ quote: null, includeShipping: true })

    expect(charge(wrapper, messages.subtotal)).toBe('—')
    expect(charge(wrapper, messages.shipping)).toBe('—')
    expect(total(wrapper)).toBe(messages.calculated_at_payment)
  })

  describe('delivery', () => {
    it('says it is calculated next until a method is chosen', async () => {
      const wrapper = await mount({ includeShipping: false })

      expect(charge(wrapper, messages.shipping)).toBe(messages.calculated_next)
    })

    it('shows a dash while the chosen method is not priced', async () => {
      const wrapper = await mount({ includeShipping: true })

      expect(charge(wrapper, messages.shipping)).toBe('—')
    })

    it('says it is free when the quote waives it', async () => {
      const wrapper = await mount({ quote: makeCartQuote({ shipping: { price: 0, waivedBy: 'promotion' } }), includeShipping: true })

      expect(charge(wrapper, messages.shipping)).toBe(messages.free)
    })
  })

  describe('pay-way fee', () => {
    it('shows no fee row for a fee the quote waived', async () => {
      setPayWay(makePayWay({ cost: 2.5, freeThreshold: 50 }))

      const wrapper = await mount({ quote: makeCartQuote({ paymentMethodFee: { amount: 0, waived: true } }) })

      expect(charge(wrapper, 'Αντικαταβολή')).toBeNull()
    })

    // the schema leaves the key optional; the row then says what it
    // is generically, in the page's language.
    it('labels the fee generically for a pay way with no key', async () => {
      const wrapper = await mount({
        quote: makeCartQuote({ paymentMethodFee: { amount: 2.5, waived: false }, payWays: [{ id: 5, key: '', fee: 2.5, waived: false }] }),
        quotedFor: { payWayId: 5 },
      })

      expect(charge(wrapper, messages.pay_way_fee)).toBe(money(2.5))
    })

    // The selection moves at once; the quote that prices it comes after.
    // Its fee is named after the pay way it priced, never the new one.
    it('names the fee after the pay way the quote priced, not a selection made since', async () => {
      setPayWay(makePayWay({ id: 2, key: 'CREDIT_CARD', cost: 0 }))

      const wrapper = await mount({ quote: FULL_QUOTE, quotedFor: PRICED_FOR })

      expect(charge(wrapper, 'Αντικαταβολή')).toBe(money(2))
      expect(charge(wrapper, useNuxtApp().$i18n.t('payment_methods.CREDIT_CARD'))).toBeNull()
    })

    it('counts the points the quote priced, not a redemption cleared since', async () => {
      const wrapper = await mount({ quote: FULL_QUOTE, quotedFor: { payWayId: 1, loyaltyPointsToRedeem: 500 } })

      expect(charge(wrapper, messages.loyalty_discount.replace('{points}', useNuxtApp().$i18n.n(500)))).toBe(`−${money(7)}`)
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

  it('names a coupon order creation would refuse, with Django\'s reason, before the order is placed', async () => {
    const wrapper = await mount({ quote: makeCartQuote({ blockingCoupon: { code: 'AUTUMN', reason: 'discount_code_expired' } }) })

    const title = wrapper.findAll('[data-slot="title"]').find(el => el.text() === messages.coupon_blocked.replace('{code}', 'AUTUMN'))
    expect(title).toBeDefined()
    const description = title!.element.nextElementSibling!.textContent!
    expect(description).toContain(useNuxtApp().$i18n.t('promotion.rejection.discount_code_expired'))
    expect(description).toContain(messages.coupon_blocked_hint)
  })

  it('warns of no coupon while the quote blocks none', async () => {
    const wrapper = await mount({ quote: makeCartQuote() })

    // Whatever the code: the title's own words around it.
    const [before, after] = messages.coupon_blocked.split('{code}')
    const titles = wrapper.findAll('[data-slot="title"]').map(el => el.text())
    expect(titles.some(text => text.startsWith(before) && text.endsWith(after))).toBe(false)
  })
})

describe('Checkout/Sidebar (webside)', () => {
  // The webside summary's own texts, as it formats them.
  const texts = componentTexts(websideSidebarSource, 'Sidebar.vue')

  const HOME = { method: 'home_delivery' as const }

  const mount = (props: Record<string, unknown> = {}) =>
    mountSuspended(WebsideCheckoutSidebar, { route: false, props: { quote: unpricedQuote(), ...props } })

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

  it('prints every row of the quote and its amount due as the total', async () => {
    setPayWay(makePayWay({ cost: 2 }))

    const wrapper = await mount({ quote: FULL_QUOTE, quotedFor: PRICED_FOR, shippingSummary: HOME })

    expect(amountBeside(wrapper, 'Σύνολο')).toBe(money(68.5))
    expect(amountBeside(wrapper, 'Μεταφορικά')).toBe(money(5))
    expect(amountBeside(wrapper, 'Αντικαταβολή')).toBe(money(2))
    expect(amountBeside(wrapper, 'Φθινόπωρο')).toBe(`-${money(10)}`)
    expect(amountBeside(wrapper, 'Έκπτωση πόντων')).toBe(`-${money(7)}`)
    expect(amountBeside(wrapper, 'Δωροκάρτα')).toBe(`-${money(20)}`)
  })

  it('leaves the delivery row to the payment step, where the method is recapped', async () => {
    const wrapper = await mount({ quote: unpricedQuote({ shipping: { price: 5, waivedBy: null } }) })

    expect(amountBeside(wrapper, 'Μεταφορικά')).toBeNull()
  })

  it('leaves the total to the payment step until the quote prices the delivery and the pay way', async () => {
    const wrapper = await mount()

    expect(amountBeside(wrapper, texts.t('total'))).toBe(texts.t('calculated_at_payment'))
  })

  it('says why, where the total would be, when Django refuses the quote, and asks again on request', async () => {
    const wrapper = await mount({ quote: null, quoteRefusal: 'Ο τρόπος πληρωμής δεν είναι διαθέσιμος.' })

    await wrapper.findAll('button').find(button => button.text() === texts.t('retry_quote'))!.trigger('click')
    expect(wrapper.emitted('retry-quote')).toHaveLength(1)
    expect(amountBeside(wrapper, 'Σύνολο')).toBe('—')
    expect(wrapper.get('[role="status"]').text()).toBe(texts.t('quote_refused', { reason: 'Ο τρόπος πληρωμής δεν είναι διαθέσιμος.' }))
  })

  it('shows a dash while the chosen method is not priced', async () => {
    const wrapper = await mount({ shippingSummary: HOME })

    expect(amountBeside(wrapper, 'Μεταφορικά')).toBe('—')
  })

  it('says the delivery is free when the quote waives it', async () => {
    const wrapper = await mount({ quote: makeCartQuote({ shipping: { price: 0, waivedBy: 'threshold' } }), shippingSummary: HOME })

    expect(amountBeside(wrapper, 'Μεταφορικά')).toBe('Δωρεάν')
  })

  it('labels the fee generically for a pay way with no key', async () => {
    const wrapper = await mount({
      quote: makeCartQuote({ paymentMethodFee: { amount: 2.5, waived: false }, payWays: [{ id: 5, key: '', fee: 2.5, waived: false }] }),
      quotedFor: { payWayId: 5 },
    })

    expect(amountBeside(wrapper, 'Προμήθεια Τρόπου πληρωμής')).toBe(money(2.5))
  })

  it('names the fee after the pay way the quote priced, not a selection made since', async () => {
    setPayWay(makePayWay({ id: 2, key: 'CREDIT_CARD', cost: 0 }))

    const wrapper = await mount({ quote: FULL_QUOTE, quotedFor: PRICED_FOR, shippingSummary: HOME })

    expect(amountBeside(wrapper, 'Αντικαταβολή')).toBe(money(2))
  })

  it('shows no fee or gift-card row the quote did not price', async () => {
    setPayWay(makePayWay({ cost: 2.5 }))

    const wrapper = await mount()

    expect(amountBeside(wrapper, 'Αντικαταβολή')).toBeNull()
    expect(amountBeside(wrapper, 'Δωροκάρτα')).toBeNull()
  })

  it('lists each applied offer with its coupon code, naming an unnamed one generically', async () => {
    const wrapper = await mount({
      quote: unpricedQuote({
        appliedPromotions: [
          { promotionId: 1, name: 'Καλωσόρισμα', code: 'WELCOME', amount: 5 },
          { promotionId: 2, name: '', code: null, amount: 3 },
        ],
      }),
    })
    const text = wrapper.text()

    expect(text).toContain('WELCOME')
    expect(text).toContain('Έκπτωση προσφοράς')
  })

  it('warns a wholesale cart below the minimum order value, with the minimum', async () => {
    setCart({ totalPrice: 60, b2bPricing: { applied: true, belowMinimum: true, minOrderValue: '150.00' } })

    const wrapper = await mount()

    expect(wrapper.text()).toContain(`Η ελάχιστη αξία παραγγελίας χονδρικής είναι ${money(150)}`)
  })

  it('names a coupon order creation would refuse, with Django\'s reason', async () => {
    const wrapper = await mount({ quote: makeCartQuote({ blockingCoupon: { code: 'AUTUMN', reason: 'discount_code_usage_limit_reached' } }) })

    const text = wrapper.text()
    expect(text).toContain(texts.t('coupon_blocked', { code: 'AUTUMN' }))
    expect(text).toContain(useNuxtApp().$i18n.t('promotion.rejection.discount_code_usage_limit_reached'))
  })

  it('recaps the chosen locker on the payment step', async () => {
    const wrapper = await mount({
      quote: makeCartQuote(),
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
