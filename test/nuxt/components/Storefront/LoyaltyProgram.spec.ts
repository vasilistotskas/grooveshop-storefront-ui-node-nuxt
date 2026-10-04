import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LoyaltyProgram from '~/components/Storefront/LoyaltyProgram.vue'
import WebsideLoyaltyProgram from '~/components/variants/webside/Storefront/LoyaltyProgram.vue'
import type { LoyaltySettings } from '~~/shared/types/LoyaltySettings'
import type { LoyaltyTier } from '~~/shared/openapi/types.gen'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { makeLoyaltySettings, makeTier } from '~~/test/fixtures/loyalty'

/**
 * The public loyalty programme page. The default tree was redesigned (a
 * volt hero, steps, the tier ladder, questions); the frozen webside copy
 * keeps its original body, run on its own below.
 */
const settings = createAsyncDataMock<LoyaltySettings>()
const tiers = createAsyncDataMock<LoyaltyTier[]>()
mockNuxtImport('useLoyalty', () => () => ({ fetchSettings: () => settings, fetchTiers: () => tiers }))

const session = await vi.hoisted(async () => ({ loggedIn: (await import('vue')).ref(false) }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: session.loggedIn,
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

describe('Webside Storefront/LoyaltyProgram', () => {
  beforeEach(() => {
    settings.reset()
    settings.status.value = 'success'
  })

  const mount = () => mountSuspended(WebsideLoyaltyProgram, { route: false })

  it('states the store\'s own redemption ratio, with a worked example', async () => {
    settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 50 })

    const text = (await mount()).text()

    expect(text).toContain('Κάθε 50 πόντοι ισούνται με 1€ έκπτωση')
    expect(text).toContain('250 πόντοι = 5€')
  })

  it('offers no conversion for a store that redeems no points', async () => {
    settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 0 })

    const text = (await mount()).text()

    expect(text).not.toContain('πόντοι ισούνται με')
  })
})

const tier = (id: number, requiredLevel: number, el: string, pointsMultiplier = 1, description = '') => makeTier({
  id,
  requiredLevel,
  pointsMultiplier,
  translations: { el: { name: el, description }, en: { name: el, description } },
})
const LADDER = [
  tier(1, 1, 'Χάλκινο'),
  tier(2, 5, 'Ασημένιο', 1.25),
  tier(3, 15, 'Χρυσό', 1.5),
  tier(4, 30, 'Πλατινένιο', 2),
]

describe('Storefront/LoyaltyProgram', () => {
  beforeEach(() => {
    settings.reset()
    tiers.reset()
    session.loggedIn.value = false
    settings.status.value = 'success'
    settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, redemptionRatioEur: 100, pointsFactor: 1.5 })
    tiers.data.value = [...LADDER].reverse()
  })

  const mountPage = () => mountSuspended(LoyaltyProgram, { route: false })
  const n = (value: number, options?: object) => useNuxtApp().$i18n.n(value, options as never)
  const eur = (value: number) => n(value, { key: 'currency', minimumFractionDigits: 0 })
  const items = (wrapper: VueWrapper, label: string) => [...wrapper.get(`ol[aria-label="${label}"]`).element.children] as HTMLElement[]
  const steps = (wrapper: VueWrapper) => items(wrapper, 'Πώς λειτουργεί')
  const cards = (wrapper: VueWrapper) => items(wrapper, 'Βαθμίδες')
  const heading = (item: HTMLElement) => item.querySelector('h3')!.textContent
  const text = (item: HTMLElement) => item.textContent!

  describe('hero', () => {
    it('states the store\'s earn and redeem rates', async () => {
      const text = (await mountPage()).get('h1').element.parentElement!.textContent!

      expect(text).toContain(`κερδίζεις ${n(1.5)} πόντους για κάθε ευρώ`)
      expect(text).toContain(`${n(100)} πόντοι = ${eur(1)}`)
    })

    it('works an example from the earn rate and what the points are worth', async () => {
      const text = (await mountPage()).text()

      // A 100 € order at 1,5 points a euro: 150 points, worth 1,50 € at 100 to the euro.
      expect(text).toContain(`${n(150)} πόντους`)
      expect(text).toContain(`Αξίζουν ${n(1.5, { key: 'currency' })} στο ταμείο`)
    })

    it('says nothing about spending, and values nothing, for a store that redeems no points', async () => {
      settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 0 })

      const text = (await mountPage()).text()

      expect(text).not.toContain('Ξόδεψέ τους στο ταμείο')
      expect(text).not.toContain('στο ταμείο')
    })

    it('offers a guest the way in, and a member the shop and their points', async () => {
      const guest = await mountPage()
      expect(guest.findAll('a').map(link => link.attributes('href'))).toEqual(expect.arrayContaining(['/account/signup', '/account/login']))

      session.loggedIn.value = true
      const member = await mountPage()
      await flushPromises()

      expect(member.findAll('a').map(link => link.attributes('href'))).toEqual(expect.arrayContaining(['/products', '/account/loyalty']))
      expect(member.findAll('a').map(link => link.attributes('href'))).not.toContain('/account/signup')
    })
  })

  describe('steps', () => {
    it('lists join, earn, climb and spend, numbered', async () => {
      const wrapper = await mountPage()

      expect(steps(wrapper).map(heading)).toEqual(['Εγγραφή', 'Κέρδος', 'Άνοδος', 'Εξαργύρωση'])
      expect(steps(wrapper).map(step => step.querySelector('span')!.textContent!.trim())).toEqual(['01', '02', '03', '04'])
    })

    it('names where each tier above the first starts, in lifetime points', async () => {
      const wrapper = await mountPage()

      expect(text(steps(wrapper)[2]!)).toContain(
        `Ασημένιο στους ${n(4000)}, Χρυσό στους ${n(14000)} και Πλατινένιο στους ${n(29000)} πόντους.`,
      )
    })

    it('leaves out the climb step for a store with one tier, and the spend step without redemption', async () => {
      tiers.data.value = [LADDER[0]!]
      settings.data.value = makeLoyaltySettings({ redemptionRatioEur: 0 })

      const wrapper = await mountPage()

      expect(steps(wrapper).map(heading)).toEqual(['Εγγραφή', 'Κέρδος'])
    })

    it('mentions the welcome bonus only where the store gives one', async () => {
      settings.data.value = makeLoyaltySettings({ newCustomerBonusEnabled: true, newCustomerBonusPoints: 200 })
      const withBonus = await mountPage()
      expect(text(steps(withBonus)[0]!)).toContain(`${n(200)} πόντους καλωσορίσματος`)

      settings.data.value = makeLoyaltySettings({ newCustomerBonusEnabled: false, newCustomerBonusPoints: 200 })
      const without = await mountPage()
      expect(text(steps(without)[0]!)).not.toContain('καλωσορίσματος')
    })
  })

  describe('tiers', () => {
    it('shows a card per tier the API returns, in level order, and says the tier follows lifetime points', async () => {
      const wrapper = await mountPage()

      expect(cards(wrapper).map(heading)).toEqual(['Χάλκινο', 'Ασημένιο', 'Χρυσό', 'Πλατινένιο'])
      expect(wrapper.text()).toContain('όλους τους πόντους που έχεις κερδίσει ποτέ')
    })

    it('does not assume four tiers', async () => {
      tiers.data.value = [...LADDER, tier(5, 50, 'Διαμάντι', 3)]

      const wrapper = await mountPage()

      expect(cards(wrapper)).toHaveLength(5)
    })

    it('shows no tiers section for a store without a ladder', async () => {
      tiers.data.value = []

      const wrapper = await mountPage()

      expect(wrapper.text()).not.toContain('Βαθμίδες')
    })

    it('prints multipliers only where the store turns them on', async () => {
      settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, tierMultiplierEnabled: true })
      const on = await mountPage()
      expect(cards(on).map(card => card.querySelector('.font-mono:not(span)')?.textContent?.trim())).toContain(`×${n(1.25)} πόντοι`)
      expect(on.text()).toContain('Ανέβαινε βαθμίδες')

      settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, tierMultiplierEnabled: false })
      const off = await mountPage()
      expect(off.text()).not.toContain('×')
      expect(off.text()).not.toContain('Ανέβαινε βαθμίδες')
    })

    it('quotes the top tier\'s multiplier in the example only while multipliers are on', async () => {
      settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, tierMultiplierEnabled: true, pointsFactor: 1 })
      const on = await mountPage()
      expect(on.text()).toContain(`Στη βαθμίδα Πλατινένιο οι πόντοι πολλαπλασιάζονται ×${n(2)}`)

      settings.data.value = makeLoyaltySettings({ xpPerLevel: 1000, tierMultiplierEnabled: false, pointsFactor: 1 })
      const off = await mountPage()
      expect(off.text()).not.toContain('πολλαπλασιάζονται')
    })

    it('puts only the top tier in ink', async () => {
      // The class IS the contract: the board draws the last tier on the inverted surface.
      const wrapper = await mountPage()

      expect(cards(wrapper).map(card => card.classList.contains('bg-inverted'))).toEqual([false, false, false, true])
    })

    it('puts no tier in ink when there is only one', async () => {
      tiers.data.value = [LADDER[0]!]

      const wrapper = await mountPage()

      expect(cards(wrapper).map(card => card.classList.contains('bg-inverted'))).toEqual([false])
    })
  })

  describe('questions', () => {
    const open = async (wrapper: VueWrapper, question: string) => {
      await wrapper.findAll('button').find(button => button.text() === question)!.trigger('click')
      await flushPromises()
    }

    it('says points never expire when the store sets no expiry', async () => {
      settings.data.value = makeLoyaltySettings({ pointsExpirationDays: 0 })
      const wrapper = await mountPage()

      await open(wrapper, 'Λήγουν οι πόντοι μου;')

      expect(wrapper.text()).toContain('Οι πόντοι δεν λήγουν')
    })

    it('says how long points last when the store sets an expiry', async () => {
      settings.data.value = makeLoyaltySettings({ pointsExpirationDays: 365 })
      const wrapper = await mountPage()

      await open(wrapper, 'Λήγουν οι πόντοι μου;')

      expect(wrapper.text()).toContain('365 ημέρες μετά την παραγγελία')
    })
  })
})
