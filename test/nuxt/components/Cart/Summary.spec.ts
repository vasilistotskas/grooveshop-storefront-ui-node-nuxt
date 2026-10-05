import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import Summary from '~/components/Cart/Summary.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { makePayWay } from '~~/test/fixtures/payWay'
import { setTenant } from '~~/test/helpers/tenant'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The cart page's order summary: the server's figures line by line (the
 * subtotal is the gross `totalPrice`, each offer's own amount comes off
 * it), the total, the VAT it holds, checkout — blocked while a line has
 * a stock problem — and the ways the store takes payment.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const flags = vi.hoisted(() => ({ GIFT_CARDS_ENABLED: false } as Record<string, boolean>))
mockNuxtImport('useSettingFlag', () => (key: string) => computed(() => flags[key] ?? false))

mockComponent('CheckoutCouponInput', { template: '<div data-stub="coupon" />' })
mockComponent('CheckoutPointsEarned', { template: '<div data-stub="points" />' })

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Cart/Summary.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

/** Whitespace-free: `text()` joins sibling elements with no space at all. */
const words = (value: string) => value.replace(/\s+/g, '')
const euro = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

beforeEach(() => {
  setTenant()
  flags.GIFT_CARDS_ENABLED = false
  clearNuxtData('footer-pay-ways')
  api.routes({
    '/api/pay-way': () => ({
      results: [makePayWay({ key: 'PAY_ON_DELIVERY' })],
    }),
  })
  useCartStore().cart = makeCart({
    items: [{ id: 1, quantity: 2, product: { price: 50, finalPrice: 50, vatPercent: 24 } }],
  })
})

const mountSummary = async () => {
  const wrapper = await mountSuspended(Summary, { route: false })
  await flushPromises()
  return wrapper
}

describe('Cart/Summary', () => {
  it('shows the subtotal, delivery still to be worked out, and the total', async () => {
    const wrapper = await mountSummary()
    const text = words(wrapper.text())

    expect(text).toContain(words(`${messages.subtotal} ${euro(useCartStore().cart!.totalPrice)}`))
    expect(text).toContain(words(`${messages.delivery} ${messages.delivery_next}`))
    expect(text).toContain(words(`${messages.total} ${euro(useCartStore().cart!.totalPrice)}`))
  })

  it('takes the offers off the total, each as its own line with its own amount and code', async () => {
    useCartStore().cart = makeCart({
      items: [{ id: 1, quantity: 2, product: { finalPrice: 50, price: 50 } }],
      promotionDiscount: 15,
      appliedPromotions: [
        { promotionId: 1, name: 'Καλοκαίρι', code: null, amount: 10 },
        { promotionId: 2, name: 'Κουπόνι', code: 'GAN20', amount: 5 },
      ],
    })

    const text = words((await mountSummary()).text())

    expect(text).toContain(words(`Καλοκαίρι -${euro(10)}`))
    expect(text).toContain(words(`Κουπόνι GAN20 -${euro(5)}`))
    expect(text).toContain(words(`${messages.total} ${euro(100 - 15)}`))
  })

  it('lists a free gift as free, by its product name', async () => {
    useCartStore().cart = makeCart({
      promotionGiftItems: [{ promotionId: 3, name: 'Δώρο', productId: 9, productName: 'Καλώδιο 20 εκ.', quantity: 1 }],
    })

    const text = words((await mountSummary()).text())

    expect(text).toContain(words(`${messages.gift.replace('{name}', 'Καλώδιο 20 εκ.')} ${messages.free}`))
  })

  it('shows the catalogue discount only when there is one', async () => {
    useCartStore().cart = makeCart({ totalDiscountValue: 0 })
    const without = (await mountSummary()).text()
    useCartStore().cart = makeCart({ totalDiscountValue: 4 })
    const withIt = (await mountSummary()).text()

    expect(without).not.toContain(messages.discount)
    expect(withIt).toContain(messages.discount)
  })

  it('says the VAT included with its rate when every line has the same one', async () => {
    const wrapper = await mountSummary()

    expect(words(wrapper.text())).toContain(words(`${messages.vat_included_rate.replace('{rate}', '24')} ${euro(useCartStore().cart!.totalVatValue)}`))
  })

  it('drops the rate when the lines carry different ones', async () => {
    useCartStore().cart = makeCart({
      items: [
        { id: 1, product: { vatPercent: 24 } },
        { id: 2, product: { id: 2, vatPercent: 13 } },
      ],
    })

    const text = words((await mountSummary()).text())

    expect(text).toContain(words(`${messages.vat_included} ${euro(useCartStore().cart!.totalVatValue)}`))
    expect(text).not.toContain('%')
  })

  it('places the coupon field and the points line', async () => {
    const wrapper = await mountSummary()

    expect(wrapper.findAll('[data-stub]').map(stub => stub.attributes('data-stub'))).toEqual(['coupon', 'points'])
  })

  it('links checkout to the checkout page', async () => {
    const wrapper = await mountSummary()
    const link = wrapper.findAll('a').find(candidate => candidate.text() === messages.checkout)!

    expect(link.attributes('href')).toBe('/checkout')
  })

  it('blocks checkout and says why while a line has a stock problem', async () => {
    useCartStore().cart = makeCart({ items: [{ quantity: 3, product: { stock: 2 } }] })

    const wrapper = await mountSummary()

    expect(wrapper.text()).toContain(messages.fix_stock_issues_first)
    expect(wrapper.text()).not.toContain(messages.checkout)
    expect(wrapper.findAll('[aria-disabled="true"]').some(el => el.text() === messages.fix_stock_issues_first)).toBe(true)
  })

  it('names the ways to pay from the store, and a gift card only when the store sells them', async () => {
    const without = await mountSummary()
    expect(without.text()).toContain(useNuxtApp().$i18n.t('payment_methods.PAY_ON_DELIVERY'))
    expect(without.text()).not.toContain(messages.gift_card)

    setTenant({ giftCardsEnabled: true })
    flags.GIFT_CARDS_ENABLED = true
    clearNuxtData('footer-pay-ways')
    const withGift = await mountSummary()

    expect(withGift.text()).toContain(messages.gift_card)
  })

  it('says a wholesale cart is wholesale, and when it is under the minimum', async () => {
    useCartStore().cart = makeCart({
      b2bPricing: { applied: true, groupName: 'Αντιπρόσωποι', allowPromotions: false, allowLoyalty: false, belowMinimum: true, minOrderValue: '200.00' },
    })

    const text = words((await mountSummary()).text())

    expect(text).toContain(words(messages.b2b_pricing_applied.replace('{group}', 'Αντιπρόσωποι')))
    expect(text).toContain(words(messages.b2b_below_minimum.replace('{minimum}', euro(200))))
  })
})
