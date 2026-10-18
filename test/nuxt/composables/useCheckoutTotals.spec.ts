import { beforeEach, describe, expect, it } from 'vitest'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import type { CartOverrides } from '~~/test/fixtures/cart'
import { makePayWay } from '~~/test/fixtures/payWay'
import type { PayWay } from '~~/shared/openapi/types.gen'
import type { CheckoutTotalsInputs } from '~/composables/useCheckoutTotals'

/**
 * What the checkout charges. The order summary prints these figures and
 * the page's "Pay …" button names the total, so a slip here shows the
 * shopper an amount the order-create call then contradicts. Each case
 * mirrors Django's own computation.
 */

function setCart(overrides: CartOverrides) {
  useCartStore().cart = makeCart(overrides)
}

function setPayWay(payWay: PayWay | null) {
  useState<PayWay | null>('selectedPayWay').value = payWay
}

const totals = (inputs: Partial<CheckoutTotalsInputs> = {}) => useCheckoutTotals({
  shippingPrice: null,
  includeShipping: false,
  includePaymentFee: false,
  loyaltyDiscount: 0,
  giftCardBalance: 0,
  ...inputs,
})

describe('useCheckoutTotals', () => {
  beforeEach(() => {
    setCart({ totalPrice: 60 })
    setPayWay(null)
  })

  it('totals the cart, the delivery, the fee and the discounts', () => {
    setCart({
      totalPrice: 100,
      promotionDiscount: 10,
      appliedPromotions: [{ promotionId: 1, name: 'Φθινόπωρο', code: null, amount: 10 }],
    })
    setPayWay(makePayWay({ cost: 2 }))

    const { total, shipping, paymentFee, appliedPromotions } = totals({
      shippingPrice: 5,
      includeShipping: true,
      includePaymentFee: true,
      loyaltyDiscount: 7,
    })

    // 100 − 10 promotion + 5 delivery + 2 fee − 7 points
    expect(total.value).toBe(90)
    expect(shipping.value).toBe(5)
    expect(paymentFee.value).toBe(2)
    expect(appliedPromotions.value.map(promo => promo.name)).toEqual(['Φθινόπωρο'])
  })

  it('follows its inputs as they change', () => {
    const shippingPrice = ref<number | null>(5)
    const includeShipping = ref(false)

    const { total } = totals({ shippingPrice, includeShipping })
    expect(total.value).toBe(60)

    includeShipping.value = true
    expect(total.value).toBe(65)

    shippingPrice.value = 3
    expect(total.value).toBe(63)
  })

  it('leaves the delivery out until a method is chosen', () => {
    const { total } = totals({ shippingPrice: 5, includeShipping: false })

    expect(total.value).toBe(60)
  })

  it('adds nothing for a chosen method that is not priced yet', () => {
    const { total, shipping } = totals({ shippingPrice: null, includeShipping: true })

    expect(shipping.value).toBeNull()
    expect(total.value).toBe(60)
  })

  it('waives the delivery when a promotion grants free shipping', () => {
    setCart({ totalPrice: 60, promotionFreeShipping: true })

    const { total, shipping } = totals({ shippingPrice: 5, includeShipping: true })

    expect(shipping.value).toBe(0)
    expect(total.value).toBe(60)
  })

  describe('pay-way fee', () => {
    it('charges the fee on the payment page', () => {
      setPayWay(makePayWay({ cost: 2.5 }))

      const { total, paymentFee } = totals({ includePaymentFee: true })

      expect(paymentFee.value).toBe(2.5)
      expect(total.value).toBe(62.5)
    })

    it('charges no fee before the payment page', () => {
      setPayWay(makePayWay({ cost: 2.5 }))

      const { total, paymentFee, payWayCost } = totals({ includePaymentFee: false })

      expect(payWayCost.value).toBe(2.5)
      expect(paymentFee.value).toBe(0)
      expect(total.value).toBe(60)
    })

    /**
     * The threshold is compared with the cart's `freeThresholdValue`: the
     * products AFTER promotions and coupons, never the delivery or the
     * fee. It is the value free shipping is judged on too.
     */
    it.each([
      { case: '39,98 €: delivery and the fee are charged', totalPrice: 39.98, promotionDiscount: 0, delivery: 2.99, threshold: 40, total: 44.97 },
      { case: '40,00 €: delivery and the fee are free', totalPrice: 40, promotionDiscount: 0, delivery: 0, threshold: 40, total: 40 },
      { case: '45,00 € less a 6,00 € coupon: both are charged', totalPrice: 45, promotionDiscount: 6, delivery: 2.99, threshold: 40, total: 43.99 },
      { case: 'delivery never lifts the discounted products over the threshold', totalPrice: 60, promotionDiscount: 15, delivery: 5, threshold: 50, total: 52 },
    ])('waives the fee on the freeThresholdValue of the cart, never recomputed: $case', ({ totalPrice, promotionDiscount, delivery, threshold, total }) => {
      setCart({ totalPrice, promotionDiscount })
      setPayWay(makePayWay({ cost: 2, freeThreshold: threshold }))

      const totalsNow = totals({ shippingPrice: delivery, includeShipping: true, includePaymentFee: true })

      expect(totalsNow.total.value).toBeCloseTo(total, 2)
    })

    it('charges no fee while there is no cart to judge the threshold on', () => {
      useCartStore().cart = null
      setPayWay(makePayWay({ cost: 2, freeThreshold: 50 }))

      const { payWayCost, paymentFee } = totals({ includePaymentFee: true })

      expect(payWayCost.value).toBe(0)
      expect(paymentFee.value).toBe(0)
    })

    it('reads the value Django sent, whatever the other totals say', () => {
      setCart({ totalPrice: 60, promotionDiscount: 0, freeThresholdValue: 30 })
      setPayWay(makePayWay({ cost: 2, freeThreshold: 50 }))

      expect(totals({ includePaymentFee: true }).payWayCost.value).toBe(2)
    })
  })

  describe('gift cards', () => {
    /**
     * Mirrors Django's redemption plan: a card never covers more than is
     * due, and a partial cover leaves at least 0,50 € for the online
     * provider's minimum charge — the sliver stays on the card.
     */
    it.each([
      { case: 'covers the whole amount when the balance exceeds it', balance: 80, applied: 60, total: 0 },
      { case: 'keeps 0,50 € due when it would leave less than that', balance: 59.8, applied: 59.5, total: 0.5 },
      { case: 'applies the whole balance when at least 0,50 € stays due', balance: 59.5, applied: 59.5, total: 0.5 },
      { case: 'applies a small balance in full', balance: 20, applied: 20, total: 40 },
    ])('$case', ({ balance, applied, total }) => {
      const totalsNow = totals({ giftCardBalance: balance })

      expect(totalsNow.giftCardApplied.value).toBeCloseTo(applied, 2)
      expect(totalsNow.total.value).toBeCloseTo(total, 2)
    })

    it('settles what is due after the delivery, the fee and the discounts', () => {
      setCart({ totalPrice: 60, promotionDiscount: 10 })
      setPayWay(makePayWay({ cost: 2 }))

      const { giftCardApplied, total } = totals({
        shippingPrice: 5,
        includeShipping: true,
        includePaymentFee: true,
        loyaltyDiscount: 7,
        giftCardBalance: 100,
      })

      // due before the card: 60 − 10 + 5 + 2 − 7
      expect(giftCardApplied.value).toBe(50)
      expect(total.value).toBe(0)
    })
  })

  it('never totals below zero when the points exceed what is due', () => {
    const { total } = totals({ loyaltyDiscount: 75 })

    expect(total.value).toBe(0)
  })
})
