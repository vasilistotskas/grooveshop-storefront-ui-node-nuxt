import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import LoyaltySummary from '~/components/Loyalty/Summary.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { makeLoyaltySettings, makeSummary, makeTier } from '~~/test/fixtures/loyalty'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'
import type { LoyaltySummary as Summary, LoyaltyTier } from '~~/shared/openapi/types.gen'

/**
 * The account's rewards overview: the balance and what it is worth at
 * checkout, and the tier ladder with the shopper's place on it.
 */

const summary = createAsyncDataMock<Summary>()
const tiers = createAsyncDataMock<LoyaltyTier[]>()
const settings = createAsyncDataMock<LoyaltySettings>()
mockNuxtImport('useLoyalty', () => () => ({
  fetchSummary: () => summary,
  fetchTiers: () => tiers,
  fetchSettings: () => settings,
}))

const tier = (id: number, requiredLevel: number, el: string, pointsMultiplier = 1) => makeTier({
  id,
  requiredLevel,
  pointsMultiplier,
  translations: { el: { name: el, description: '' }, en: { name: el, description: '' } },
})
const BRONZE = tier(1, 1, 'Χάλκινο')
const SILVER = tier(2, 5, 'Ασημένιο', 1.5)
const GOLD = tier(3, 10, 'Χρυσό', 2)

beforeEach(() => {
  summary.reset()
  tiers.reset()
  settings.reset()
  settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 100, xpPerLevel: 1000 })
  summary.data.value = makeSummary({ pointsBalance: 2340, totalXp: 5000, level: 5, tier: SILVER })
  summary.status.value = 'success'
  // Out of order on purpose: the component sorts by requiredLevel.
  tiers.data.value = [GOLD, BRONZE, SILVER]
})

const mountSummary = () => mountSuspended(LoyaltySummary, { route: false })
const n = (value: number, format?: 'currency') => useNuxtApp().$i18n.n(value, format as 'currency')
const steps = (wrapper: VueWrapper) => wrapper.findAll('ol li')

describe('Loyalty/Summary balance', () => {
  it('shows the points balance and what it is worth at the store\'s own ratio', async () => {
    settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 100 })

    const wrapper = await mountSummary()
    const card = wrapper.get('section[aria-label="Υπόλοιπο"]')

    expect(card.text()).toContain(n(2340))
    expect(card.text()).toContain(`= ${n(23.4, 'currency')} για να ξοδέψεις στο ταμείο`)
  })

  it('values the balance at the ratio the store set, not a fixed one', async () => {
    settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 50 })

    const wrapper = await mountSummary()

    expect(wrapper.get('section[aria-label="Υπόλοιπο"]').text()).toContain(n(46.8, 'currency'))
  })

  it.each([
    ['before the settings arrive', undefined],
    ['for a ratio that redeems nothing', makeLoyaltySettings({ redemptionRatioEur: 0 })],
    ['while the programme is off', makeLoyaltySettings({ enabled: false, redemptionRatioEur: 100 })],
  ])('quotes no value %s', async (_case, value) => {
    settings.data.value = value

    const wrapper = await mountSummary()

    expect(wrapper.get('section[aria-label="Υπόλοιπο"]').text()).not.toContain('€')
  })
})

describe('Loyalty/Summary tier ladder', () => {
  it('draws one step per tier the API returns, in level order, from the store\'s XP per level', async () => {
    const wrapper = await mountSummary()

    const spans = (step: DOMWrapper<Element>) => step.findAll('span').map(span => span.text())
    expect(steps(wrapper).map(step => [spans(step)[1], spans(step).at(-1)])).toEqual([
      ['Χάλκινο', n(0)],
      [expect.stringContaining('Ασημένιο'), n(4000)],
      ['Χρυσό', n(9000)],
    ])
  })

  it('does not assume four tiers', async () => {
    tiers.data.value = [BRONZE, SILVER, GOLD, tier(4, 20, 'Πλατινένιο'), tier(5, 30, 'Διαμάντι')]

    const wrapper = await mountSummary()

    expect(steps(wrapper)).toHaveLength(5)
    expect(steps(wrapper)[4]!.text()).toContain(n(29000))
  })

  it('fills the steps up to the shopper\'s tier and marks it as the current one', async () => {
    const wrapper = await mountSummary()

    expect(steps(wrapper).map(step => step.attributes('aria-current'))).toEqual([undefined, 'step', undefined])
    // The fill IS the contract: steps up to and including the current one.
    expect(steps(wrapper).map(step => step.find('span').classes().includes('bg-secondary'))).toEqual([true, true, false])
  })

  it('fills no step for a shopper without a tier', async () => {
    summary.data.value = makeSummary({ tier: null, totalXp: 0 })

    const wrapper = await mountSummary()

    expect(steps(wrapper).map(step => step.find('span').classes().includes('bg-secondary'))).toEqual([false, false, false])
  })

  it('shows no ladder at all while the tiers are unknown, leaving the balance alone', async () => {
    tiers.data.value = []

    const wrapper = await mountSummary()

    expect(wrapper.find('ol').exists()).toBe(false)
    expect(wrapper.get('section[aria-label="Υπόλοιπο"]').text()).toContain(n(2340))
  })
})

describe('Loyalty/Summary what is left to the next tier', () => {
  const line = (wrapper: VueWrapper) => wrapper.get('section[aria-labelledby] p').text()

  it('says how many more points reach the next tier, from lifetime points', async () => {
    const wrapper = await mountSummary()

    // Gold starts at (10 - 1) x 1000; the shopper has 5000.
    expect(line(wrapper)).toBe(`Κέρδισε άλλους ${n(4000)} πόντους για τη βαθμίδα Χρυσό.`)
  })

  it('quotes the multiplier only while the store has tier multipliers on', async () => {
    settings.data.value = makeLoyaltySettings({ tierMultiplierEnabled: true, xpPerLevel: 1000 })

    const wrapper = await mountSummary()

    expect(line(wrapper)).toBe(`Κέρδισε άλλους ${n(4000)} πόντους για τη βαθμίδα Χρυσό (×${n(2)}).`)
  })

  it('quotes no multiplier when the store has them off', async () => {
    settings.data.value = makeLoyaltySettings({ tierMultiplierEnabled: false, xpPerLevel: 1000 })

    const wrapper = await mountSummary()

    expect(line(wrapper)).not.toContain('×')
  })

  it('quotes no multiplier for a tier that adds none', async () => {
    settings.data.value = makeLoyaltySettings({ tierMultiplierEnabled: true, xpPerLevel: 1000 })
    summary.data.value = makeSummary({ tier: null, totalXp: 0 })

    const wrapper = await mountSummary()

    expect(line(wrapper)).toBe(`Κέρδισε άλλους ${n(0)} πόντους για τη βαθμίδα Χάλκινο.`)
  })

  it('points a shopper with no tier at the first one', async () => {
    summary.data.value = makeSummary({ tier: null, totalXp: 0 })
    tiers.data.value = [SILVER, GOLD]

    const wrapper = await mountSummary()

    expect(line(wrapper)).toBe(`Κέρδισε άλλους ${n(4000)} πόντους για τη βαθμίδα Ασημένιο.`)
  })

  it('says the shopper is on the top tier', async () => {
    summary.data.value = makeSummary({ tier: GOLD, totalXp: 12000 })

    const wrapper = await mountSummary()

    expect(line(wrapper)).toBe('Είσαι στην κορυφαία βαθμίδα.')
  })

  // A tier the list does not hold (removed since, say) is no position on
  // the ladder: there is no "next" to name, and no "top tier" to claim.
  it('says nothing when the shopper\'s tier is not on the ladder', async () => {
    summary.data.value = makeSummary({ tier: tier(99, 7, 'Άγνωστο') })

    const wrapper = await mountSummary()

    expect(wrapper.find('section[aria-labelledby] > p').exists()).toBe(false)
  })

  it('never reads below zero points to go', async () => {
    summary.data.value = makeSummary({ tier: SILVER, totalXp: 20000 })

    const wrapper = await mountSummary()

    expect(line(wrapper)).toBe(`Κέρδισε άλλους ${n(0)} πόντους για τη βαθμίδα Χρυσό.`)
  })
})

describe('Loyalty/Summary states', () => {
  it('shows skeletons, not the cards, while loading', async () => {
    summary.data.value = undefined
    summary.status.value = 'pending'

    const wrapper = await mountSummary()

    expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(2)
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('says so, with a retry that refetches, when the summary fails', async () => {
    summary.data.value = undefined
    summary.status.value = 'error'
    summary.error.value = new Error('Network error')

    const wrapper = await mountSummary()

    expect(wrapper.get('[role="alert"]').text()).toContain('Δεν μπορέσαμε να φορτώσουμε τους πόντους σου.')
    await wrapper.get('[role="alert"] button').trigger('click')
    expect(summary.refresh).toHaveBeenCalledTimes(1)
  })
})
