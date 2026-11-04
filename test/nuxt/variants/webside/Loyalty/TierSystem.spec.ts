import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import WebsideTierSystem from '~/components/variants/webside/Loyalty/TierSystem.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { createLoyaltySettingsMock } from '~~/test/helpers/loyaltySettings'
import { makeLoyaltySettings, makeSummary, makeTier } from '~~/test/fixtures/loyalty'
import type { LoyaltySummary, LoyaltyTier } from '~~/shared/openapi/types.gen'

/**
 * Webside's tier details slideover quotes a tier's points multiplier only
 * while the store has tier multipliers on, and only for a tier that adds one
 * (above 1x): a store without them must not advertise one, and a tier that
 * adds none has no benefit to list. The slideover teleports to
 * `document.body`; the copy is the component's own `<i18n>` (el).
 */
const summary = createAsyncDataMock<LoyaltySummary>()
const tiers = createAsyncDataMock<LoyaltyTier[]>()
const settings = createLoyaltySettingsMock()
mockNuxtImport('useLoyaltySettings', () => () => settings.use)
mockNuxtImport('useLoyalty', () => () => ({
  fetchSummary: () => summary,
  fetchTiers: () => tiers,
}))

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
  summary.data.value = makeSummary({ tier: BRONZE })
  summary.status.value = 'success'
  tiers.status.value = 'success'
  tiers.data.value = [BRONZE, SILVER]
})

async function openDetails() {
  const wrapper = await mountSuspended(WebsideTierSystem, { route: false })
  await wrapper.findComponent({ name: 'UCard' }).trigger('click')
  await flushPromises()
  // Every tier's details sit in a collapsed accordion item: open them all.
  for (const trigger of document.querySelectorAll<HTMLElement>('[role="dialog"] button[aria-expanded="false"]')) {
    trigger.click()
  }
  await flushPromises()
  return wrapper
}

const panelText = () => document.querySelector('[role="dialog"]')!.textContent!.replace(/\s+/g, ' ')

describe('webside Loyalty/TierSystem multipliers', () => {
  it('lists a tier\'s multiplier while the store has tier multipliers on, for a tier above 1x', async () => {
    settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, tierMultiplierEnabled: true })

    await openDetails()

    expect(panelText()).toContain('Πολλαπλασιαστής πόντων +50%')
    // Only Silver adds one: Bronze (1x) lists no benefit of its own.
    expect(panelText().match(/Πολλαπλασιαστής πόντων/g)).toHaveLength(1)
  })

  it('lists no multiplier at all while the store has them off', async () => {
    settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, tierMultiplierEnabled: false })

    await openDetails()

    expect(panelText()).not.toContain('Πολλαπλασιαστής πόντων')
  })
})
