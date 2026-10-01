import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import LoyaltySummary from '~/components/Loyalty/Summary.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { makeLoyaltySettings, makeSummary, makeTier } from '~~/test/fixtures/loyalty'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'
import type { LoyaltySummary as Summary, LoyaltyTier } from '~~/shared/openapi/types.gen'

/**
 * The account's loyalty overview: balance and its euro value, level and
 * XP progress, the current tier and what the next one unlocks.
 */

// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const summary = createAsyncDataMock<Summary>()
const tiers = createAsyncDataMock<LoyaltyTier[]>()
const settings = createAsyncDataMock<LoyaltySettings>()
mockNuxtImport('useLoyalty', () => () => ({
  fetchSummary: () => summary,
  fetchTiers: () => tiers,
  fetchSettings: () => settings,
}))

const BRONZE = makeTier({ id: 1, requiredLevel: 1, pointsMultiplier: 1 })
const SILVER = makeTier({
  id: 2,
  requiredLevel: 5,
  pointsMultiplier: 1.5,
  translations: {
    el: { name: 'Ασημένιο', description: 'Ασημένια βαθμίδα με πολλαπλασιαστή 1.5x' },
    en: { name: 'Silver', description: 'Silver tier with a 1.5x multiplier' },
  },
})
const GOLD = makeTier({
  id: 3,
  requiredLevel: 10,
  pointsMultiplier: 2,
  translations: { el: { name: 'Χρυσό', description: '' }, en: { name: 'Gold', description: '' } },
})

beforeEach(() => {
  summary.reset()
  tiers.reset()
  settings.reset()
  settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 100 })
  summary.data.value = makeSummary({ pointsBalance: 1500, totalXp: 5000, level: 5, tier: SILVER, pointsToNextTier: 500 })
  summary.status.value = 'success'
  // Out of order on purpose: the component sorts by requiredLevel.
  tiers.data.value = [GOLD, BRONZE, SILVER]
})

const mountSummary = () => mountSuspended(LoyaltySummary, { route: false })
const cards = (wrapper: VueWrapper) => wrapper.findAllComponents({ name: 'UCard' })

describe('Loyalty/Summary', () => {
  it('shows the balance, what it is worth, the level and the XP', async () => {
    const wrapper = await mountSummary()
    const [points, level] = cards(wrapper)

    expect(points!.find('.text-5xl').text()).toBe('1500')
    expect(points!.text()).toContain(useNuxtApp().$i18n.n(15, 'currency'))
    expect(level!.find('.text-5xl').text()).toBe('5')
    expect(level!.text()).toContain('Επίπεδο 5')
    expect(level!.text()).toContain(`${(5000).toLocaleString()} XP συνολικά`)
  })

  // The ratio is the store's own (`LOYALTY_REDEMPTION_RATIO_EUR`); it used
  // to be a hardcoded 100 points per euro whatever the store set.
  it('values the balance at the store\'s own redemption ratio', async () => {
    settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 50 })

    const wrapper = await mountSummary()

    expect(cards(wrapper)[0]!.text()).toContain(useNuxtApp().$i18n.n(30, 'currency'))
    // The explanation states the same ratio, not a fixed 100.
    expect(cards(wrapper)[0]!.text()).toContain('(50 πόντοι = 1€)')
  })

  it.each([
    ['before the settings arrive', undefined],
    ['for a ratio that redeems nothing', makeLoyaltySettings({ redemptionRatioEur: 0 })],
  ])('shows no euro value %s', async (_case, value) => {
    settings.data.value = value

    const wrapper = await mountSummary()

    expect(cards(wrapper)[0]!.text()).not.toContain('€')
  })

  it('shows the XP still to go and the share of the way already covered', async () => {
    const wrapper = await mountSummary()

    expect(wrapper.text()).toContain('500 XP')
    // 5000 of 5000 + 500.
    expect(wrapper.findComponent({ name: 'UProgress' }).props('modelValue')).toBe(91)
  })

  it('shows a full bar and "top level" once there is no next tier', async () => {
    summary.data.value = makeSummary({ tier: GOLD, pointsToNextTier: null })

    const wrapper = await mountSummary()

    expect(wrapper.text()).toContain('Μέγιστο επίπεδο')
    expect(wrapper.findComponent({ name: 'UProgress' }).props('modelValue')).toBe(100)
  })

  describe('tier', () => {
    it('names the current tier in the page language, with its description', async () => {
      const wrapper = await mountSummary()

      expect(wrapper.findComponent({ name: 'UBadge' }).text()).toBe('Ασημένιο')
      expect(wrapper.text()).toContain('Ασημένια βαθμίδα με πολλαπλασιαστή 1.5x')
      expect(wrapper.text()).not.toContain('Silver')
    })

    it('shows no name or description rather than another language\'s', async () => {
      summary.data.value = makeSummary({
        tier: makeTier({ id: 2, translations: { en: { name: 'Silver', description: 'Silver tier' } } }),
      })

      const wrapper = await mountSummary()

      expect(wrapper.findComponent({ name: 'UBadge' }).text()).toBe('')
      expect(wrapper.text()).not.toContain('Silver')
    })

    it('says so when no tier is assigned yet', async () => {
      summary.data.value = makeSummary({ tier: null })

      const wrapper = await mountSummary()

      expect(wrapper.findComponent({ name: 'UBadge' }).text()).toBe('Δεν έχει ανατεθεί βαθμίδα')
    })
  })

  describe('next tier preview', () => {
    it('names the tier after the current one and the multiplier it unlocks', async () => {
      const wrapper = await mountSummary()

      expect(wrapper.text()).toContain('Ξεκλειδώστε τη βαθμίδα Χρυσό')
      expect(wrapper.text()).toContain('Ξεκλειδώνεται πολλαπλασιαστής πόντων +100%')
    })

    it('points a shopper with no tier at the first one, with no multiplier line for 1x', async () => {
      summary.data.value = makeSummary({ tier: null })

      const wrapper = await mountSummary()

      expect(wrapper.text()).toContain('Ξεκλειδώστε τη βαθμίδα Χάλκινο')
      expect(wrapper.text()).not.toContain('Ξεκλειδώνεται πολλαπλασιαστής')
    })

    it('shows nothing past the top tier', async () => {
      summary.data.value = makeSummary({ tier: GOLD, pointsToNextTier: null })

      const wrapper = await mountSummary()

      expect(wrapper.text()).not.toContain('Ξεκλειδώστε')
    })
  })

  it.each([
    [2, '/products'],
    [3, '/loyalty-program'],
  ])('quick action card %i navigates to %s', async (index, path) => {
    const wrapper = await mountSummary()

    await cards(wrapper)[index]!.trigger('click')

    expect(navigateToMock).toHaveBeenCalledWith(path)
  })

  it('shows skeletons, not the cards, while loading', async () => {
    summary.data.value = undefined
    summary.status.value = 'pending'

    const wrapper = await mountSummary()

    expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(2)
    expect(cards(wrapper)).toHaveLength(0)
  })

  it('shows the error with a retry that refetches', async () => {
    summary.data.value = undefined
    summary.status.value = 'error'
    summary.error.value = new Error('Network error')

    const wrapper = await mountSummary()

    expect(wrapper.text()).toContain('Αποτυχία φόρτωσης δεδομένων')
    expect(wrapper.text()).toContain('Network error')
    await wrapper.findAll('button').find(button => button.text() === 'Δοκιμάστε ξανά')!.trigger('click')
    expect(summary.refresh).toHaveBeenCalledTimes(1)
  })

  // By rank, never by name: the seeded "Ασημένιο" and "Πλατινένιο" never
  // matched the names the colours were keyed on, and merchants rename.
  describe('the tier badge colour', () => {
    const PLATINUM = makeTier({ id: 4, requiredLevel: 20, translations: { el: { name: 'Πλατινένιο', description: '' }, en: { name: 'Platinum', description: '' } } })
    const badgeColor = (wrapper: VueWrapper) =>
      wrapper.findAllComponents({ name: 'UBadge' }).find(badge => badge.props('size') === 'lg')!.props('color')

    it.each([
      ['bronze', BRONZE, 'warning'],
      ['silver', SILVER, 'neutral'],
      ['gold', GOLD, 'warning'],
      ['platinum', PLATINUM, 'info'],
    ])('colours the %s rung of the ladder', async (_rung, tier, color) => {
      tiers.data.value = [GOLD, PLATINUM, BRONZE, SILVER]
      summary.data.value = makeSummary({ tier })

      expect(badgeColor(await mountSummary())).toBe(color)
    })

    it('keeps a renamed tier\'s colour', async () => {
      const renamed = { ...SILVER, translations: { el: { name: 'VIP', description: '' }, en: { name: 'VIP', description: '' } } }
      tiers.data.value = [BRONZE, renamed, GOLD]
      summary.data.value = makeSummary({ tier: renamed })

      expect(badgeColor(await mountSummary())).toBe('neutral')
    })
  })
})
