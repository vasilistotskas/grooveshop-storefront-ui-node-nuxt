/**
 * useQuotedPayWayOptions: the fee next to each pay way is the checkout
 * quote's, never one the app works out from the pay way's configuration.
 */
import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { makeCartQuote } from '~~/test/fixtures/checkoutQuote'

const option = (overrides: { value?: number, name?: string, freeThreshold?: number } = {}) => ({
  value: 3,
  name: 'Αντικαταβολή',
  freeThreshold: 50,
  providerCode: 'cash_on_delivery',
  ...overrides,
})

const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

describe('useQuotedPayWayOptions', () => {
  it('names the fee the quote charges, and the threshold that would waive it', () => {
    const options = useQuotedPayWayOptions([option()], makeCartQuote({ payWays: [{ id: 3, key: 'PAY_ON_DELIVERY', fee: 2.5, waived: false }] }))

    expect(options.value[0]).toMatchObject({
      label: `Αντικαταβολή (+${money(2.5)})`,
      cost: 2.5,
      freeThresholdHint: useNuxtApp().$i18n.t('pay_way_free_above', { amount: money(50) }),
      providerCode: 'cash_on_delivery',
    })
  })

  // Django judged the threshold (on the products after promotions, in
  // the order's currency): the card says nothing a waived fee would need.
  it('shows no fee and no hint for a fee the quote waived', () => {
    const options = useQuotedPayWayOptions([option()], makeCartQuote({ payWays: [{ id: 3, key: 'PAY_ON_DELIVERY', fee: 0, waived: true }] }))

    expect(options.value[0]).toMatchObject({ label: 'Αντικαταβολή', cost: 0, freeThresholdHint: '' })
  })

  it('names no threshold for a fee its pay way never waives', () => {
    const options = useQuotedPayWayOptions([option({ freeThreshold: 0 })], makeCartQuote({ payWays: [{ id: 3, key: 'PAY_ON_DELIVERY', fee: 2.5, waived: false }] }))

    expect(options.value[0]!.freeThresholdHint).toBe('')
  })

  it.each([
    ['before the quote answers', null],
    ['for a pay way the quote does not list', makeCartQuote({ payWays: [{ id: 9, key: 'CARD', fee: 1, waived: false }] })],
  ])('guesses no fee %s', (_case, quote) => {
    const options = useQuotedPayWayOptions([option()], quote)

    expect(options.value[0]).toMatchObject({ label: 'Αντικαταβολή', cost: 0, freeThresholdHint: '' })
  })

  it('follows the quote as it changes', () => {
    const quote = ref(makeCartQuote({ payWays: [{ id: 3, key: 'PAY_ON_DELIVERY', fee: 2.5, waived: false }] }))
    const options = useQuotedPayWayOptions([option()], quote)
    expect(options.value[0]!.cost).toBe(2.5)

    quote.value = makeCartQuote({ payWays: [{ id: 3, key: 'PAY_ON_DELIVERY', fee: 0, waived: true }] })

    expect(options.value[0]!.cost).toBe(0)
  })
})
