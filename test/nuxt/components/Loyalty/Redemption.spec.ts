import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import LoyaltyRedemption from '~/components/Loyalty/Redemption.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { makeCart } from '~~/test/fixtures/cart'
import { makeLoyaltySettings, makeSummary } from '~~/test/fixtures/loyalty'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'
import type { CartDetail, LoyaltySummary } from '~~/shared/openapi/types.gen'

/**
 * Checkout's points redemption. Nothing is spent here: the component
 * only records the shopper's intent (`redeemed`) for order creation,
 * capped by BOTH the balance and what the products are worth at the
 * store's points-per-euro ratio.
 */
const settings = createAsyncDataMock<LoyaltySettings>()
const summary = createAsyncDataMock<LoyaltySummary>()
const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))

mockNuxtImport('useLoyalty', () => () => ({
  fetchSettings: () => settings,
  fetchSummary: () => summary,
}))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

beforeEach(() => {
  settings.reset()
  summary.reset()
  settings.data.value = makeLoyaltySettings()
  summary.data.value = makeSummary({ pointsBalance: 100 })
  summary.status.value = 'success'
  useCartStore().cart = makeCart()
})

function mountRedemption(maxDiscountAmount = 100) {
  return mountSuspended(LoyaltyRedemption, {
    props: { currency: 'EUR', maxDiscountAmount },
    route: false,
  })
}

const pointsInput = (wrapper: VueWrapper) => wrapper.findComponent({ name: 'UInputNumber' })
const submitButton = (wrapper: VueWrapper) => wrapper.find('button[type="submit"]')
/** The number inside the hexagon: the balance left after what was applied. */
const shownBalance = (wrapper: VueWrapper) => wrapper.find('svg + div span').text()

async function enterPoints(wrapper: VueWrapper, points: number) {
  await pointsInput(wrapper).setValue(points)
  await flushPromises()
}

async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('Loyalty/Redemption', () => {
  describe('refusing a redemption', () => {
    it.each([
      [150, 100, 'Δεν έχετε αρκετούς πόντους'],
      // 500 points are within the 1000 balance but worth 5 € against 2 € of products.
      [500, 2, 'Δεν μπορείτε να εξαργυρώσετε πόντους αξίας μεγαλύτερης από το σύνολο προϊόντων'],
      [-10, 100, 'Πρέπει να εξαργυρώσετε τουλάχιστον 1 πόντο'],
    ])('refuses %i points against %i € of products with its reason', async (points, maxDiscountAmount, message) => {
      summary.data.value = makeSummary({ pointsBalance: maxDiscountAmount === 2 ? 1000 : 100 })
      const wrapper = await mountRedemption(maxDiscountAmount)

      await enterPoints(wrapper, points)
      await submit(wrapper)

      expect(wrapper.text()).toContain(message)
      expect(wrapper.emitted('redeemed')).toBeUndefined()
      expect(toastAdd).not.toHaveBeenCalled()
    })
  })

  describe('applying a redemption', () => {
    it.each([
      [50, 0.5],
      [75, 0.75],
      [100, 1],
    ])('records %i points as a %s € discount and says so', async (points, amount) => {
      const wrapper = await mountRedemption()

      await enterPoints(wrapper, points)
      await submit(wrapper)

      expect(wrapper.emitted('redeemed')).toEqual([[{ amount, currency: 'EUR', points }]])
      expect(toastAdd).toHaveBeenCalledWith({
        title: 'Η έκπτωση εφαρμόστηκε',
        description: `Εξαργυρώσατε ${points} πόντους για έκπτωση ${amount} EUR`,
        color: 'success',
      })
    })

    it('shows the discount and the balance left, and locks the form until cleared', async () => {
      const wrapper = await mountRedemption()

      await enterPoints(wrapper, 40)
      await submit(wrapper)

      const alert = wrapper.findComponent({ name: 'UAlert' })
      expect(alert.findAll('p').map(row => [row.find('span').text(), row.find('strong').text()])).toEqual([
        ['Ποσό έκπτωσης:', '0.40 EUR'],
        ['Υπόλοιπο:', '60'],
      ])
      expect(shownBalance(wrapper)).toBe('60')
      expect(pointsInput(wrapper).find('input').attributes('disabled')).toBeDefined()
      expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('prices points at the store\'s own ratio', async () => {
      // 50 points per euro: 100 points are worth 2 €, not the default 1 €.
      settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 50 })
      const wrapper = await mountRedemption()

      await enterPoints(wrapper, 100)
      expect(submitButton(wrapper).text()).toBe('Εξαργύρωση 2.00 €')
      await submit(wrapper)

      expect(wrapper.emitted('redeemed')).toEqual([[{ amount: 2, currency: 'EUR', points: 100 }]])
    })

    it('gives the points back when the applied discount is dismissed', async () => {
      const wrapper = await mountRedemption()
      await enterPoints(wrapper, 40)
      await submit(wrapper)

      await wrapper.findComponent({ name: 'UAlert' }).find('button').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('cleared')).toHaveLength(1)
      expect(wrapper.findComponent({ name: 'UAlert' }).exists()).toBe(false)
      expect(shownBalance(wrapper)).toBe('100')
      expect(pointsInput(wrapper).find('input').attributes('disabled')).toBeUndefined()
    })
  })

  describe('the redeem button', () => {
    it('is disabled until points are entered, then states their value', async () => {
      const wrapper = await mountRedemption()

      expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
      expect(submitButton(wrapper).text()).toBe('Εξαργύρωση 0.00 €')

      await enterPoints(wrapper, 25)

      expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
      expect(submitButton(wrapper).text()).toBe('Εξαργύρωση 0.25 €')
    })

    it.each([
      // The whole balance when the products are worth more…
      [250, 100, 'Εξαργύρωση 2.50 €'],
      // …but only what the products are worth when the balance is bigger.
      [1000, 3, 'Εξαργύρωση 3.00 €'],
    ])('"redeem all" with %i points against %i € of products fills in the most that can be used', async (pointsBalance, maxDiscountAmount, label) => {
      summary.data.value = makeSummary({ pointsBalance })
      const wrapper = await mountRedemption(maxDiscountAmount)

      const redeemAll = wrapper.findAll('button').find(button => button.text() === 'Εξαργύρωση όλων')
      await redeemAll!.trigger('click')

      expect(submitButton(wrapper).text()).toBe(label)
    })

    it.each([
      ['no points', 0, 100],
      ['no products to discount', 500, 0],
    ])('offers nothing to redeem with %s', async (_case, pointsBalance, maxDiscountAmount) => {
      summary.data.value = makeSummary({ pointsBalance })
      const wrapper = await mountRedemption(maxDiscountAmount)

      expect(pointsInput(wrapper).find('input').attributes('disabled')).toBeDefined()
      expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
      expect(wrapper.text()).not.toContain('Εξαργύρωση όλων')
    })
  })

  it('shows a skeleton, not the form, while the balance loads', async () => {
    summary.data.value = undefined
    summary.status.value = 'pending'

    const wrapper = await mountRedemption()

    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
    expect(wrapper.find('form').exists()).toBe(false)
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

      const wrapper = await mountRedemption()

      expect(wrapper.text()).toBe('')
    })

    // Order creation drops a redemption on a wholesale cart unless the
    // merchant opts in, so offering it there would discount nothing.
    it.each<[string, CartDetail['b2bPricing'], boolean]>([
      ['a retail cart', null, true],
      ['a wholesale cart', { applied: true, groupName: 'Wholesale', allowPromotions: false, allowLoyalty: false }, false],
      ['a wholesale cart whose merchant opted in', { applied: true, groupName: 'Wholesale', allowPromotions: false, allowLoyalty: true }, true],
      ['a wholesale group that did not apply', { applied: false, allowLoyalty: false }, true],
    ])('on %s offers the form: %s', async (_case, b2bPricing, offered) => {
      useCartStore().cart = makeCart({ b2bPricing })

      const wrapper = await mountRedemption()

      expect(wrapper.find('form').exists()).toBe(offered)
    })
  })
})
