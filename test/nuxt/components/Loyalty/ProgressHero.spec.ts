import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import LoyaltyProgressHero from '~/components/Loyalty/ProgressHero.vue'
import WebsideLoyaltyProgressHero from '~/components/variants/webside/Loyalty/ProgressHero.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { trees } from '~~/test/helpers/trees'
import { makeLoyaltySettings, makeSummary, makeTier } from '~~/test/fixtures/loyalty'
import type { LoyaltySummary, LoyaltyTier } from '~~/shared/openapi/types.gen'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'

/**
 * The loyalty hero band (the `loyalty_hero` page section): the current
 * tier, level and XP, and how far the shopper is towards the next tier.
 *
 * The XP bounds come from the tiers' `requiredLevel` and the store's
 * `xpPerLevel`: a tier starting at level L starts at (L - 1) × xpPerLevel
 * XP. The two trees share that logic; they differ only in `ready` — the
 * default also requires the numbers the template dereferences, the
 * webside copy only an object (see the last case).
 *
 * The copy is the component's own `<i18n>` (el).
 */
const COPY = {
  noTier: 'Καμία βαθμίδα',
  level: (level: number) => `Επίπεδο ${level}`,
  toNextTier: (xp: string) => `${xp} XP μέχρι την επόμενη βαθμίδα`,
  maxTier: 'Μέγιστη βαθμίδα!',
}

const summary = createAsyncDataMock<LoyaltySummary>()
const tiers = createAsyncDataMock<LoyaltyTier[]>()
const settings = createAsyncDataMock<LoyaltySettings>()
mockNuxtImport('useLoyalty', () => () => ({
  fetchSummary: () => summary,
  fetchTiers: () => tiers,
  fetchSettings: () => settings,
}))

const BRONZE = makeTier({ id: 1, requiredLevel: 1 })
const SILVER = makeTier({
  id: 2,
  requiredLevel: 5,
  pointsMultiplier: 1.5,
  translations: { el: { name: 'Ασημένιο', description: '' }, en: { name: 'Silver', description: '' } },
})
const GOLD = makeTier({
  id: 3,
  requiredLevel: 10,
  pointsMultiplier: 2,
  translations: { el: { name: 'Χρυσό', description: '' }, en: { name: 'Gold', description: '' } },
})

/** Formatted as the page locale formats it — `toLocaleString(locale)`. */
const el = (value: number) => value.toLocaleString('el')

const progress = (wrapper: VueWrapper) => wrapper.find('[role="progressbar"]')

describe.each(trees(LoyaltyProgressHero, WebsideLoyaltyProgressHero))('$tree Loyalty/ProgressHero', ({ tree, C }) => {
  beforeEach(() => {
    summary.reset()
    tiers.reset()
    settings.reset()
    // Silver (level 5 → 4000 XP) to Gold (level 10 → 9000 XP), 6500 in.
    summary.data.value = makeSummary({ pointsBalance: 1234, totalXp: 6500, level: 7, tier: SILVER, pointsToNextTier: 2500 })
    summary.status.value = 'success'
    tiers.data.value = [BRONZE, SILVER, GOLD]
    tiers.status.value = 'success'
    settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000 })
    settings.status.value = 'success'
  })

  const mountHero = () => mountSuspended(C, { route: false })

  it('shows the current tier, the level and the XP', async () => {
    const wrapper = await mountHero()

    expect(wrapper.find('h3').text()).toBe('Ασημένιο')
    expect(wrapper.find('h3 + p').text()).toContain(COPY.level(7))
    expect(wrapper.text()).toContain(`${el(6500)} / ${el(9000)} XP`)
    expect(wrapper.text()).toContain(COPY.toNextTier(el(2500)))
    expect(wrapper.text()).toContain(el(1234))
  })

  it('measures the bar from the current tier\'s first XP to the next tier\'s', async () => {
    const wrapper = await mountHero()

    // (6500 - 4000) / (9000 - 4000)
    expect(progress(wrapper).attributes('aria-valuenow')).toBe('50')
  })

  it('takes the XP per level from the store settings', async () => {
    settings.data.value = makeLoyaltySettings({ xpPerLevel: 500 })
    summary.data.value = makeSummary({ totalXp: 3000, level: 7, tier: SILVER, pointsToNextTier: 1500 })

    const wrapper = await mountHero()

    // Silver starts at 2000 XP, Gold at 4500: (3000 - 2000) / 2500.
    expect(progress(wrapper).attributes('aria-valuenow')).toBe('40')
    expect(wrapper.text()).toContain(`${el(3000)} / ${el(4500)} XP`)
  })

  it('falls back to 1000 XP per level while the settings say nothing', async () => {
    settings.data.value = undefined

    const wrapper = await mountHero()

    expect(progress(wrapper).attributes('aria-valuenow')).toBe('50')
  })

  it('shows a full bar and the top-tier note on the last tier', async () => {
    summary.data.value = makeSummary({ totalXp: 12000, level: 13, tier: GOLD, pointsToNextTier: null })

    const wrapper = await mountHero()

    expect(progress(wrapper).attributes('aria-valuenow')).toBe('100')
    expect(wrapper.text()).toContain(`${el(12000)} / ${el(12000)} XP`)
    expect(wrapper.text()).toContain(COPY.maxTier)
    expect(wrapper.text()).not.toContain('μέχρι την επόμενη βαθμίδα')
  })

  it('never runs the bar past full or below empty', async () => {
    summary.data.value = makeSummary({ totalXp: 20000, level: 7, tier: SILVER, pointsToNextTier: 0 })
    const over = await mountHero()
    expect(progress(over).attributes('aria-valuenow')).toBe('100')
    over.unmount()

    summary.data.value = makeSummary({ totalXp: 1000, level: 7, tier: SILVER, pointsToNextTier: 8000 })
    const under = await mountHero()
    expect(progress(under).attributes('aria-valuenow')).toBe('0')
  })

  it('counts a shopper with no tier yet from the first tier', async () => {
    summary.data.value = makeSummary({ totalXp: 2000, level: 3, tier: null, pointsToNextTier: 2000 })

    const wrapper = await mountHero()

    expect(wrapper.find('h3').text()).toBe(COPY.noTier)
    // Bronze (0 XP) to Silver (4000 XP).
    expect(progress(wrapper).attributes('aria-valuenow')).toBe('50')
    expect(wrapper.text()).toContain(`${el(2000)} / ${el(4000)} XP`)
  })

  it('shows an empty bar for a tier the tier list does not know', async () => {
    summary.data.value = makeSummary({ totalXp: 6500, level: 7, tier: makeTier({ id: 99, requiredLevel: 7 }), pointsToNextTier: 100 })

    const wrapper = await mountHero()

    expect(progress(wrapper).attributes('aria-valuenow')).toBe('0')
    expect(wrapper.text()).toContain(`${el(6500)} / 0 XP`)
  })

  it('names the tier in the page language only', async () => {
    summary.data.value = makeSummary({
      tier: makeTier({ id: 2, requiredLevel: 5, translations: { en: { name: 'Silver', description: '' } } }),
    })

    const wrapper = await mountHero()

    expect(wrapper.find('h3').text()).toBe(COPY.noTier)
  })

  it('shows a skeleton while nothing has loaded yet', async () => {
    summary.reset()
    summary.status.value = 'pending'

    const wrapper = await mountHero()

    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
    expect(wrapper.find('h3').exists()).toBe(false)
  })

  it.each(['summary', 'tiers', 'settings'] as const)('renders nothing when the %s lookup fails', async (which) => {
    ({ summary, tiers, settings })[which].status.value = 'error'

    const wrapper = await mountHero()

    expect(wrapper.find('h3').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(false)
  })

  // The webside copy's `ready` only checks that an object arrived, so a
  // partial payload throws inside its render; the default guards it.
  it.runIf(tree === 'default').each(['totalXp', 'level', 'pointsBalance'] as const)('renders nothing for a summary without %s', async (field) => {
    const { [field]: _missing, ...partial } = makeSummary()
    summary.data.value = partial as LoyaltySummary

    const wrapper = await mountHero()

    expect(wrapper.find('h3').exists()).toBe(false)
  })
})
