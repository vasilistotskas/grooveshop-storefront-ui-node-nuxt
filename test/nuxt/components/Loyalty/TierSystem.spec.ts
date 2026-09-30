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
 * The account's "tiers & progress" card and the slideover it opens: the
 * tier ladder (a stepper), each tier's requirements and benefits (an
 * accordion) and how levels work.
 *
 * A tier starting at level L starts at (L - 1) × xpPerLevel XP and ends
 * one XP before the next tier starts. The component takes the tiers in
 * the order the API returns them (Django orders them by level), so the
 * fixtures are in that order. No webside twin exists.
 *
 * The slideover teleports to `document.body`; the copy is the
 * component's own `<i18n>` (el).
 */
const COPY = {
  current: 'ΤΡΕΧΟΥΣΑ',
  unlocked: 'ΞΕΚΛΕΙΔΩΜΕΝΗ',
  locked: 'ΚΛΕΙΔΩΜΕΝΗ',
  noTier: 'Καμία βαθμίδα',
  fasterEarning: 'Ταχύτερη συλλογή πόντων',
}

const summary = createAsyncDataMock<LoyaltySummary>()
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
  translations: { el: { name: 'Ασημένιο', description: 'Για τακτικούς πελάτες' }, en: { name: 'Silver', description: '' } },
})
const GOLD = makeTier({
  id: 3,
  requiredLevel: 10,
  pointsMultiplier: 2,
  translations: { el: { name: 'Χρυσό', description: '' }, en: { name: 'Gold', description: '' } },
})

const el = (value: number) => value.toLocaleString('el')
const panel = () => document.querySelector<HTMLElement>('[role="dialog"]')

/** The stepper's steps — the accordion's rows are `item`s too, without a `title`. */
const steps = () => [...panel()!.querySelectorAll('[data-slot="item"]')]
  .filter(item => item.querySelector('[data-slot="title"]'))

const mountCard = () => mountSuspended(LoyaltyTierSystem, { route: false })

async function openSlideover(wrapper: VueWrapper) {
  await wrapper.find('.cursor-pointer').trigger('click')
  await flushPromises()
  if (!panel()) throw new Error('the slideover did not open')
}

/** The accordion row's trigger that reads `name` (its badge sits beside it). */
function accordionRow(name: string) {
  const trigger = [...panel()!.querySelectorAll<HTMLButtonElement>('button[aria-controls]')]
    .find(button => button.querySelector('span.font-medium')?.textContent?.trim() === name)
  if (!trigger) throw new Error(`no accordion row named ${name}`)
  return trigger
}

async function expandRow(name: string) {
  const trigger = accordionRow(name)
  if (trigger.getAttribute('aria-expanded') !== 'true') {
    trigger.click()
    await flushPromises()
  }
  return document.getElementById(trigger.getAttribute('aria-controls')!)!
}

/** The value printed beside a requirement's label, e.g. "Ελάχιστο XP". */
function requirement(content: HTMLElement, label: string) {
  const row = [...content.querySelectorAll('.justify-between')]
    .find(node => node.firstElementChild?.textContent?.trim() === label)
  return row?.lastElementChild?.textContent?.trim()
}

describe('Loyalty/TierSystem', () => {
  beforeEach(() => {
    summary.reset()
    tiers.reset()
    settings.reset()
    summary.data.value = makeSummary({ totalXp: 6500, level: 7, tier: SILVER, pointsToNextTier: 2500 })
    summary.status.value = 'success'
    tiers.data.value = [BRONZE, SILVER, GOLD]
    tiers.status.value = 'success'
    settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000 })
    settings.status.value = 'success'
  })

  describe('the card', () => {
    it('names the current tier and how many tiers there are', async () => {
      const wrapper = await mountCard()

      expect(wrapper.find('h3 + p').text()).toBe('Βαθμίδα: Ασημένιο · Δείτε 3 βαθμίδες')
    })

    it('says so when the shopper has no tier yet', async () => {
      summary.data.value = makeSummary({ tier: null })

      const wrapper = await mountCard()

      expect(wrapper.find('h3 + p').text()).toContain(`Βαθμίδα: ${COPY.noTier}`)
    })

    it('shows a skeleton while the tiers load', async () => {
      tiers.reset()
      tiers.status.value = 'pending'

      const wrapper = await mountCard()

      expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(true)
      expect(wrapper.find('h3').exists()).toBe(false)
    })

    it('renders nothing for a store with no tiers', async () => {
      tiers.data.value = []

      const wrapper = await mountCard()

      expect(wrapper.find('h3').exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'USkeleton' }).exists()).toBe(false)
    })

    it.each(['summary', 'tiers', 'settings'] as const)('renders nothing when the %s lookup fails', async (which) => {
      ({ summary, tiers, settings })[which].status.value = 'error'

      const wrapper = await mountCard()

      expect(wrapper.find('h3').exists()).toBe(false)
    })
  })

  describe('the slideover', () => {
    it('opens from the card on the tier ladder, each step from its level', async () => {
      const wrapper = await mountCard()

      await openSlideover(wrapper)

      expect(steps().map(step => step.querySelector('[data-slot="title"]')?.textContent?.trim()))
        .toEqual(['Χάλκινο', 'Ασημένιο', 'Χρυσό'])
      expect(steps().map(step => step.querySelector('[data-slot="description"]')?.textContent?.trim()))
        .toEqual(['Επίπεδο 1+', 'Επίπεδο 5+', 'Επίπεδο 10+'])
    })

    it('marks the tiers the shopper has not reached as locked steps', async () => {
      const wrapper = await mountCard()
      await openSlideover(wrapper)

      expect(steps().map(step => step.hasAttribute('data-disabled'))).toEqual([false, false, true])
      expect(steps()[1]!.getAttribute('data-state')).toBe('active')
    })

    it('unlocks a tier at exactly its required level', async () => {
      // Level 10 reaches Gold before Django has moved the shopper there.
      summary.data.value = makeSummary({ totalXp: 9000, level: 10, tier: SILVER, pointsToNextTier: 0 })

      const wrapper = await mountCard()
      await openSlideover(wrapper)

      expect(steps()[2]!.hasAttribute('data-disabled')).toBe(false)
      expect(accordionRow('Χρυσό').textContent).toContain(COPY.unlocked)
    })

    it('badges each tier current, unlocked or locked', async () => {
      const wrapper = await mountCard()
      await openSlideover(wrapper)

      expect(['Χάλκινο', 'Ασημένιο', 'Χρυσό'].map(name => accordionRow(name).textContent?.replace(name, '').trim()))
        .toEqual([COPY.unlocked, COPY.current, COPY.locked])
    })

    it('opens the current tier\'s details: requirements and benefits', async () => {
      const wrapper = await mountCard()
      await openSlideover(wrapper)

      expect(accordionRow('Ασημένιο').getAttribute('aria-expanded')).toBe('true')
      const content = await expandRow('Ασημένιο')
      expect(content.textContent).toContain('Για τακτικούς πελάτες')
      expect(requirement(content, 'Απαιτούμενο Επίπεδο')).toBe('Επίπεδο 5')
      expect(requirement(content, 'Ελάχιστο XP')).toBe(`${el(4000)} XP`)
      expect(requirement(content, 'Μέγιστο XP')).toBe(`${el(8999)} XP`)
      expect(content.textContent).toContain('Πολλαπλασιαστής πόντων +50%')
      expect(content.textContent).toContain(COPY.fasterEarning)
    })

    it('gives the top tier no upper bound', async () => {
      const wrapper = await mountCard()
      await openSlideover(wrapper)

      const content = await expandRow('Χρυσό')
      expect(requirement(content, 'Ελάχιστο XP')).toBe(`${el(9000)} XP`)
      expect(requirement(content, 'Μέγιστο XP')).toBeUndefined()
      expect(content.textContent).toContain('Πολλαπλασιαστής πόντων +100%')
    })

    it('promises no faster earning for a tier without a multiplier', async () => {
      const wrapper = await mountCard()
      await openSlideover(wrapper)

      const content = await expandRow('Χάλκινο')
      expect(requirement(content, 'Ελάχιστο XP')).toBe(`${el(0)} XP`)
      expect(content.textContent).toContain('Πολλαπλασιαστής πόντων 0%')
      expect(content.textContent).not.toContain(COPY.fasterEarning)
    })

    it('scales every XP figure with the store\'s XP per level', async () => {
      settings.data.value = makeLoyaltySettings({ xpPerLevel: 250 })

      const wrapper = await mountCard()
      await openSlideover(wrapper)

      const content = await expandRow('Ασημένιο')
      expect(requirement(content, 'Ελάχιστο XP')).toBe(`${el(1000)} XP`)
      expect(requirement(content, 'Μέγιστο XP')).toBe(`${el(2249)} XP`)
      expect(panel()!.textContent).toContain(`(${el(250)} XP = 1 επίπεδο)`)
      expect(panel()!.querySelector('code')?.textContent?.trim()).toBe(`Level = 1 + (Total XP / ${el(250)})`)
    })

    it('names a tier with no name in the page language "Unknown"', async () => {
      tiers.data.value = [BRONZE, SILVER, makeTier({ id: 3, requiredLevel: 10, translations: { en: { name: 'Gold', description: '' } } })]

      const wrapper = await mountCard()
      await openSlideover(wrapper)

      expect(accordionRow('Unknown').textContent).toContain(COPY.locked)
    })
  })
})
