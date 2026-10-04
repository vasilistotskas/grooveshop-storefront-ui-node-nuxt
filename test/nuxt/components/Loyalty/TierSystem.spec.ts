import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoyaltyTierSystem from '~/components/Loyalty/TierSystem.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { makeLoyaltySettings, makeSummary, makeTier } from '~~/test/fixtures/loyalty'
import type { LoyaltySummary, LoyaltyTier } from '~~/shared/openapi/types.gen'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'

/**
 * The tier card's "Tier details" slideover: every tier the API returns,
 * where it starts in lifetime points, where the shopper stands, and what
 * the merchant wrote for it. A tier starting at level L starts at
 * (L - 1) x xpPerLevel. Benefits are the tier's own description alone; a
 * multiplier is listed only while the store has tier multipliers on.
 *
 * The slideover teleports to `document.body`; the copy is the
 * component's own `<i18n>` (el).
 */
const summary = createAsyncDataMock<LoyaltySummary>()
const tiers = createAsyncDataMock<LoyaltyTier[]>()
const settings = createAsyncDataMock<LoyaltySettings>()
mockNuxtImport('useLoyalty', () => () => ({
  fetchSummary: () => summary,
  fetchTiers: () => tiers,
  fetchSettings: () => settings,
}))

const tier = (id: number, requiredLevel: number, el: string, description: string, pointsMultiplier = 1) => makeTier({
  id,
  requiredLevel,
  pointsMultiplier,
  translations: { el: { name: el, description }, en: { name: el, description } },
})
const BRONZE = tier(1, 1, 'Χάλκινο', '')
const SILVER = tier(2, 5, 'Ασημένιο', 'Για τακτικούς πελάτες', 1.5)
const GOLD = tier(3, 10, 'Χρυσό', '', 2)

beforeEach(() => {
  summary.reset()
  tiers.reset()
  settings.reset()
  settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, tierMultiplierEnabled: false })
  summary.data.value = makeSummary({ tier: SILVER })
  // Out of order on purpose: the component sorts by requiredLevel.
  tiers.data.value = [GOLD, BRONZE, SILVER]
})

const n = (value: number) => useNuxtApp().$i18n.n(value)
const panel = () => document.querySelector<HTMLElement>('[role="dialog"]')!
const items = () => [...panel().querySelectorAll('li')]
const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim()

async function openDetails() {
  const wrapper: VueWrapper = await mountSuspended(LoyaltyTierSystem, { route: false })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  return wrapper
}

describe('Loyalty/TierSystem', () => {
  it('offers nothing while the ladder is empty or unknown', async () => {
    tiers.data.value = []

    const wrapper = await mountSuspended(LoyaltyTierSystem, { route: false })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('lists every tier in level order with the lifetime points it starts at', async () => {
    await openDetails()

    expect(items().map(text)).toEqual([
      expect.stringContaining(`Χάλκινο`),
      expect.stringContaining('Ασημένιο'),
      expect.stringContaining('Χρυσό'),
    ])
    expect(items().map(item => item.querySelector('.font-mono')!.textContent)).toEqual([n(0), n(4000), n(9000)])
  })

  it('says which tiers are unlocked, which is current and which is locked', async () => {
    await openDetails()

    expect(items().map(item => item.querySelector('[data-slot="base"]')!.textContent)).toEqual([
      'Ξεκλειδωμένη', 'Τρέχουσα', 'Κλειδωμένη',
    ])
  })

  it('locks every tier for a shopper without one', async () => {
    summary.data.value = makeSummary({ tier: null })

    await openDetails()

    expect(items().map(item => item.querySelector('[data-slot="base"]')!.textContent)).toEqual([
      'Κλειδωμένη', 'Κλειδωμένη', 'Κλειδωμένη',
    ])
  })

  it('shows the tier\'s own description and invents no perks for one without', async () => {
    await openDetails()

    expect(text(items()[1]!)).toContain('Για τακτικούς πελάτες')
    // Bronze has no description: its name, status and start are all there is.
    expect(items()[0]!.querySelectorAll('p')).toHaveLength(1)
  })

  it('lists a multiplier only while the store has tier multipliers on, and only above 1x', async () => {
    settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, tierMultiplierEnabled: true })

    await openDetails()

    expect(items().map(text)).toEqual([
      expect.not.stringContaining('×'),
      expect.stringContaining(`×${useNuxtApp().$i18n.n(1.5)} πόντοι`),
      expect.stringContaining(`×${useNuxtApp().$i18n.n(2)} πόντοι`),
    ])
  })

  it('lists no multiplier at all when the store has them off', async () => {
    await openDetails()

    expect(panel().textContent).not.toContain('×')
  })

  it('links to the programme page', async () => {
    await openDetails()

    expect(panel().querySelector('a')!.getAttribute('href')).toBe('/loyalty-program')
  })
})
