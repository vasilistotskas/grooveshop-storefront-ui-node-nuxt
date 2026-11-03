import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockComponent, mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import WebsideSummary from '~/components/variants/webside/Loyalty/Summary.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { createLoyaltySettingsMock } from '~~/test/helpers/loyaltySettings'
import { makeLoyaltySettings, makeSummary, makeTier } from '~~/test/fixtures/loyalty'
import { setTenantFeatures } from '~~/test/helpers/tenant'
import type { LoyaltySummary, LoyaltyTier } from '~~/shared/openapi/types.gen'

/**
 * Webside's rewards overview hints at what the next tier unlocks, and quotes
 * that tier's points multiplier only while the store has tier multipliers on.
 */
const summary = createAsyncDataMock<LoyaltySummary>()
const tiers = createAsyncDataMock<LoyaltyTier[]>()
const settings = createLoyaltySettingsMock()
mockNuxtImport('useLoyaltySettings', () => () => settings.use)
mockNuxtImport('useLoyalty', () => () => ({
  fetchSummary: () => summary,
  fetchTiers: () => tiers,
}))

/**
 * `UTooltip` needs `UApp`'s TooltipProvider, which a bare mount does not
 * have. The stub keeps the trigger and the tooltip's text.
 */
mockComponent('UTooltip', { props: { text: { type: String, default: '' } }, template: '<div :title="text"><slot /></div>' })

const tier = (id: number, requiredLevel: number, el: string, pointsMultiplier = 1) => makeTier({
  id,
  requiredLevel,
  pointsMultiplier,
  translations: { el: { name: el, description: '' }, en: { name: el, description: '' } },
})
const BRONZE = tier(1, 1, 'Χάλκινο')
const SILVER = tier(2, 5, 'Ασημένιο', 1.5)

beforeEach(() => {
  summary.reset()
  tiers.reset()
  settings.reset()
  setTenantFeatures({ loyalty: true })
  summary.data.value = makeSummary({ tier: BRONZE })
  summary.status.value = 'success'
  tiers.data.value = [BRONZE, SILVER]
})

async function mountSummary() {
  const wrapper = await mountSuspended(WebsideSummary, { route: false })
  await flushPromises()
  return wrapper
}

describe('webside Loyalty/Summary next tier multiplier', () => {
  it('quotes the next tier\'s multiplier while the store has tier multipliers on', async () => {
    settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, tierMultiplierEnabled: true })

    const wrapper = await mountSummary()

    expect(wrapper.text()).toContain('Ξεκλειδώνεται πολλαπλασιαστής πόντων +50%')
  })

  it('quotes none while the store has them off', async () => {
    settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, tierMultiplierEnabled: false })

    const wrapper = await mountSummary()

    expect(wrapper.text()).not.toContain('πολλαπλασιαστής πόντων')
  })
})
