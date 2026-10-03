import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import LoyaltyRewardsCard from '~/components/Loyalty/RewardsCard.vue'
import { makeLoyaltySettings, makeSummary, makeTier } from '~~/test/fixtures/loyalty'

/**
 * The overview's rewards card: the spendable balance, what it is worth at
 * the store's redemption ratio, and the XP left to the next tier (tiers
 * are XP levels: a tier needing level N starts at (N − 1) × XP per level).
 */
const data = vi.hoisted(() => ({
  summary: null as unknown,
  tiers: [] as unknown[],
  settings: null as unknown,
}))
mockNuxtImport('useLoyalty', () => () => ({
  fetchSummary: () => ({ data: ref(data.summary) }),
  fetchTiers: () => ({ data: ref(data.tiers) }),
  fetchSettings: () => ({ data: ref(data.settings) }),
}))

const BRONZE = makeTier({ id: 1, requiredLevel: 1 })
const SILVER = makeTier({ id: 2, requiredLevel: 3 })
const GOLD = makeTier({ id: 3, requiredLevel: 11 })

beforeEach(() => {
  data.tiers = [GOLD, BRONZE, SILVER]
  data.settings = makeLoyaltySettings({ redemptionRatioEur: 100, xpPerLevel: 1000 })
  data.summary = makeSummary({ pointsBalance: 2340, totalXp: 2340, tier: SILVER })
})

const tierName = (tier: LoyaltyTier) => extractTranslated(tier, 'name', 'el')

describe('Loyalty/RewardsCard', () => {
  it('shows the balance, its tier and what it is worth at checkout', async () => {
    const wrapper = await mountSuspended(LoyaltyRewardsCard)

    expect(wrapper.text()).toContain('2.340 πόντοι')
    expect(wrapper.text()).toContain(tierName(SILVER))
    expect(wrapper.text()).toContain(`Αξίζουν ${useNuxtApp().$i18n.n(23.4, 'currency')} στο ταμείο`)
  })

  it('counts the XP left to the next tier up the ladder, and draws the way there', async () => {
    data.summary = makeSummary({ pointsBalance: 100, totalXp: 6000, tier: SILVER })

    const wrapper = await mountSuspended(LoyaltyRewardsCard)

    // Silver starts at 2.000 XP, Gold at 10.000: 6.000 is half way.
    expect(wrapper.text()).toContain(`4.000 XP ως τη βαθμίδα ${tierName(GOLD)}`)
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('50')
  })

  it('aims a shopper without a tier at the first one', async () => {
    data.summary = makeSummary({ pointsBalance: 0, totalXp: 0, tier: null })

    const wrapper = await mountSuspended(LoyaltyRewardsCard)

    expect(wrapper.text()).toContain(tierName(BRONZE))
  })

  it('says so at the top tier', async () => {
    data.summary = makeSummary({ pointsBalance: 50, totalXp: 12000, tier: GOLD })

    const wrapper = await mountSuspended(LoyaltyRewardsCard)

    expect(wrapper.text()).toContain('Είσαι στην κορυφαία βαθμίδα')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
  })

  it('says one point in the singular', async () => {
    data.summary = makeSummary({ pointsBalance: 1, totalXp: 1, tier: BRONZE })

    const wrapper = await mountSuspended(LoyaltyRewardsCard)

    expect(wrapper.text()).toContain('1 πόντος')
  })

  it('quotes no value while the store redeems no points', async () => {
    data.settings = makeLoyaltySettings({ redemptionRatioEur: 0 })

    const wrapper = await mountSuspended(LoyaltyRewardsCard)

    expect(wrapper.text()).not.toContain('Αξίζουν')
  })

  it('links the whole card to the rewards page', async () => {
    const wrapper = await mountSuspended(LoyaltyRewardsCard)

    expect(wrapper.get('a').attributes('href')).toBe(useLocalePath()('account-loyalty'))
  })
})
