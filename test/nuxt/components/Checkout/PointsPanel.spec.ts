import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import PointsPanel from '~/components/Checkout/PointsPanel.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { makeCart } from '~~/test/fixtures/cart'
import { makeLoyaltySettings, makeSummary } from '~~/test/fixtures/loyalty'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'
import type { CartDetail, LoyaltySummary } from '~~/shared/openapi/types.gen'

/**
 * Points redemption on the checkout's payment page. Nothing is spent
 * here: the panel records the shopper's intent (`redeemed`) for order
 * creation, capped by BOTH the balance and what the items are worth at
 * the store's points-per-euro ratio, and shows the redemption the page
 * holds.
 */
const settings = createAsyncDataMock<LoyaltySettings>()
const summary = createAsyncDataMock<LoyaltySummary>()

mockNuxtImport('useLoyalty', () => () => ({
  fetchSettings: () => settings,
  fetchSummary: () => summary,
}))

beforeEach(() => {
  settings.reset()
  summary.reset()
  settings.data.value = makeLoyaltySettings()
  summary.data.value = makeSummary({ pointsBalance: 1240 })
  summary.status.value = 'success'
  useCartStore().cart = makeCart()
})

const n = (value: number, format?: string) => format ? useNuxtApp().$i18n.n(value, format) : useNuxtApp().$i18n.n(value)

function mount(props: { maxDiscountAmount?: number, redemption?: { amount: number, currency: string, points: number } | null } = {}) {
  return mountSuspended(PointsPanel, {
    props: { currency: 'EUR', maxDiscountAmount: 100, redemption: null, ...props },
    route: false,
  })
}

async function redeem(wrapper: VueWrapper, points: number) {
  await wrapper.findComponent({ name: 'UInputNumber' }).setValue(points)
  await flushPromises()
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('Checkout/PointsPanel', () => {
  it('shows the balance and what the points are worth on this order', async () => {
    const wrapper = await mount({ maxDiscountAmount: 12.4 })

    expect(wrapper.text()).toContain(`${n(1240)} πόντοι`)
    // 1240 points, but 12,40 € of items at 100 points per euro caps it there.
    expect(wrapper.text()).toContain(`100 πόντοι = 1 €. Έως ${n(12.4, 'currency')} έκπτωση σε αυτή την παραγγελία.`)
  })

  it('records the intent to redeem, priced at the store\'s ratio', async () => {
    settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 50 })
    const wrapper = await mount()

    await redeem(wrapper, 250)

    expect(wrapper.emitted('redeemed')).toEqual([[{ amount: 5, currency: 'EUR', points: 250 }]])
  })

  it.each([
    { points: 1500, balance: 1240, items: 100, reason: 'Δεν έχεις τόσους πόντους' },
    // 500 points are within the balance but worth 5 € against 2 € of items.
    { points: 500, balance: 1240, items: 2, reason: 'Οι πόντοι αξίζουν περισσότερο από τα προϊόντα της παραγγελίας' },
  ])('refuses $points points against $items € of items, saying why', async ({ points, balance, items, reason }) => {
    summary.data.value = makeSummary({ pointsBalance: balance })
    const wrapper = await mount({ maxDiscountAmount: items })

    await redeem(wrapper, points)

    expect(wrapper.text()).toContain(reason)
    expect(wrapper.emitted('redeemed')).toBeUndefined()
  })

  it('shows the redemption the order holds, with the balance it leaves', async () => {
    const wrapper = await mount({ redemption: { amount: 5, currency: 'EUR', points: 500 } })

    expect(wrapper.get('[role="status"]').text()).toContain(`${n(500)} πόντοι εξαργυρώθηκαν · −${n(5, 'currency')}`)
    expect(wrapper.text()).toContain(`${n(740)} πόντοι`)
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('asks the page to drop the redemption', async () => {
    const wrapper = await mount({ redemption: { amount: 5, currency: 'EUR', points: 500 } })

    await wrapper.findAll('button').find(button => button.text() === 'Αφαίρεση')!.trigger('click')

    expect(wrapper.emitted('cleared')).toHaveLength(1)
  })

  it('offers the field again once the page drops the redemption', async () => {
    const wrapper = await mount({ redemption: { amount: 5, currency: 'EUR', points: 500 } })

    await wrapper.setProps({ redemption: null })

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('cannot redeem without points', async () => {
    summary.data.value = makeSummary({ pointsBalance: 0 })
    const wrapper = await mount()

    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  describe('self-gating', () => {
    it.each([
      ['loyalty is off', () => { settings.data.value = makeLoyaltySettings({ enabled: false }) }],
      ['the settings have not arrived', () => { settings.data.value = undefined }],
      // A ratio of 0 redeems nothing; dividing by it offered unbounded
      // points at an infinite discount.
      ['the store redeems no points (a ratio of 0)', () => { settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 0 }) }],
    ])('renders nothing when %s', async (_case, arrange) => {
      arrange()

      const wrapper = await mount()

      expect(wrapper.text()).toBe('')
    })

    // Order creation drops a redemption on a wholesale cart unless the
    // merchant opts in, so offering it there would discount nothing.
    it.each<[string, CartDetail['b2bPricing'], boolean]>([
      ['a retail cart', null, true],
      ['a wholesale cart', { applied: true, groupName: 'Wholesale', allowPromotions: false, allowLoyalty: false }, false],
      ['a wholesale cart whose merchant opted in', { applied: true, groupName: 'Wholesale', allowPromotions: false, allowLoyalty: true }, true],
    ])('on %s offers the field: %s', async (_case, b2bPricing, offered) => {
      useCartStore().cart = makeCart({ b2bPricing })

      const wrapper = await mount()

      expect(wrapper.find('form').exists()).toBe(offered)
    })
  })
})
