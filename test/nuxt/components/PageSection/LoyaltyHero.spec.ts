import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import LoyaltyHero from '~/components/PageSection/LoyaltyHero.vue'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { makeLoyaltySettings, makeTier } from '~~/test/fixtures/loyalty'
import { createLoyaltySettingsMock } from '~~/test/helpers/loyaltySettings'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('useRequestApi', () => () => api)

const session = vi.hoisted(() => ({ loggedIn: undefined as any }))
mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  return {
    loggedIn: session.loggedIn,
    user: ref(null),
    session: ref({}),
    ready: ref(true),
    fetch: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
})

const TIERS_URL = '/api/loyalty/tiers'

const TIERS = [
  makeTier({ id: 1, requiredLevel: 1, pointsMultiplier: 1 }),
  makeTier({ id: 2, requiredLevel: 5, pointsMultiplier: 1.25, translations: { el: { name: 'Ασημένιο' }, en: { name: 'Silver' } } }),
  makeTier({ id: 3, requiredLevel: 15, pointsMultiplier: 2, translations: { el: { name: 'Πλατινένιο' }, en: { name: 'Platinum' } } }),
]

const TERMS = makeLoyaltySettings({
  pointsFactor: 1,
  redemptionRatioEur: 100,
  tierMultiplierEnabled: true,
  newCustomerBonusEnabled: true,
  newCustomerBonusPoints: 100,
})
const settings = createLoyaltySettingsMock(TERMS)
mockNuxtImport('useLoyaltySettings', () => () => settings.use)

/**
 * The member's hero fetches its own summary, so it is stubbed. It is a
 * `Lazy` component: the stub matches the component its async wrapper
 * resolves, so the test waits for that import.
 */
const HeroStub = { template: '<div data-test="hero" />' }
async function mountBand(props: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(LoyaltyHero, {
    route: false,
    props: { title: 'Οι πόντοι σου', ...props },
    global: { stubs: { LoyaltyProgressHero: HeroStub } },
  })
  await flushPromises()
  return wrapper
}

/** One euro as the store prints it — Intl puts a no-break space before the sign. */
const oneEuro = () => useNuxtApp().$i18n.n(1, { key: 'currency', minimumFractionDigits: 0 })

const tierCards = (wrapper: Awaited<ReturnType<typeof mountBand>>) =>
  wrapper.findAll('ol > li').map(li => li.findAll('p').map(p => p.text()))

/**
 * The programme, sold to a guest from the store's own terms and tiers,
 * and the member's own points once the page knows who is looking. Both
 * the store's loyalty feature gates it, the requests included.
 */
describe('PageSection/LoyaltyHero', () => {
  beforeEach(() => {
    clearNuxtData(['loyalty-tiers'])
    settings.reset()
    if (session.loggedIn) session.loggedIn.value = false
    setTenant({ loyaltyEnabled: true, storeName: 'Demo' })
    setTenantFeatures({ loyalty: true })
    api.routes({ [TIERS_URL]: TIERS })
  })

  it('tells a guest what a euro earns, what points are worth and what joining gives', async () => {
    const wrapper = await mountBand()

    expect(wrapper.text()).toContain('Επιβράβευση Demo')
    expect(wrapper.find('h2').text()).toBe(`1 πόντος για κάθε ευρώ. 100 πόντοι = ${oneEuro()}.`)
    expect(wrapper.text()).toContain('Με την πρώτη σου παραγγελία παίρνεις 100 πόντους καλωσορίσματος.')
    expect(wrapper.text()).toContain('Ανέβαινε βαθμίδες για να κερδίζεις πιο γρήγορα.')
    const links = wrapper.findAll('a').map(a => [a.text(), a.attributes('href')])
    expect(links).toEqual([['Γίνε μέλος δωρεάν', '/account/signup'], ['Πώς λειτουργεί', '/loyalty-program']])
  })

  it('uses the eyebrow, wording and routes of the operator where they are set', async () => {
    const wrapper = await mountBand({
      eyebrow: 'Λέσχη',
      ctaText: 'Μπες στη λέσχη',
      ctaLink: '/account/signup?ref=home',
      secondaryCtaText: 'Οι όροι',
      secondaryCtaLink: '/legal/rewards',
    })

    expect(wrapper.text()).toContain('Λέσχη')
    expect(wrapper.text()).not.toContain('Επιβράβευση Demo')
    const links = wrapper.findAll('a').map(a => [a.text(), a.attributes('href')])
    expect(links).toEqual([['Μπες στη λέσχη', '/account/signup?ref=home'], ['Οι όροι', '/legal/rewards']])
  })

  it('keeps each default it was not given a replacement for', async () => {
    const wrapper = await mountBand({ ctaText: 'Μπες στη λέσχη' })

    const links = wrapper.findAll('a').map(a => [a.text(), a.attributes('href')])
    expect(links).toEqual([['Μπες στη λέσχη', '/account/signup'], ['Πώς λειτουργεί', '/loyalty-program']])
  })

  it.each([
    { surface: 'muted', classes: ['bg-muted'] },
    { surface: 'default', classes: ['bg-default', 'border-y'] },
  ])('lays the guest band on the $surface ground', async ({ surface, classes }) => {
    const wrapper = await mountBand({ surface })

    expect(wrapper.find('section').classes()).toEqual(expect.arrayContaining(classes))
  })

  it('lists the ladder with each tier\'s multiplier, the top tier last in ink', async () => {
    const wrapper = await mountBand()

    expect(tierCards(wrapper)).toEqual([
      ['Χάλκινο', '×1 πόντοι'],
      ['Ασημένιο', '×1,25 πόντοι'],
      ['Πλατινένιο', '×2 πόντοι'],
    ])
    // The class is the contract: the tier to aim for is the one in ink.
    expect(wrapper.findAll('ol > li').at(-1)!.classes()).toContain('bg-on-volt')
  })

  it('says where each tier starts, and promises no bonus or faster earning, where the store runs neither', async () => {
    settings.data.value = { ...TERMS, tierMultiplierEnabled: false, newCustomerBonusEnabled: false, pointsFactor: 1.5 }

    const wrapper = await mountBand()

    expect(wrapper.find('h2').text()).toBe(`1,5 πόντοι για κάθε ευρώ. 100 πόντοι = ${oneEuro()}.`)
    expect(wrapper.text()).not.toContain('καλωσορίσματος')
    expect(wrapper.text()).not.toContain('βαθμίδες')
    expect(tierCards(wrapper).map(card => card[1])).toEqual(['Από το επίπεδο 1', 'Από το επίπεδο 5', 'Από το επίπεδο 15'])
  })

  it('shows a member their own points instead, under the section title', async () => {
    session.loggedIn.value = true

    const wrapper = await mountBand()

    expect(wrapper.find('h2').text()).toBe('Οι πόντοι σου')
    await vi.waitFor(() => expect(wrapper.find('[data-test="hero"]').exists()).toBe(true))
    expect(wrapper.find('ol').exists()).toBe(false)
  })

  it('asks for no tiers and renders nothing on a store without the loyalty feature', async () => {
    setTenantFeatures({ loyalty: false })

    const wrapper = await mountBand()

    expect(api.callsTo(TIERS_URL)).toEqual([])
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('promises no figures it cannot read: the guest card is left out, the member\'s band stays', async () => {
    settings.data.value = null

    expect((await mountBand()).find('section').exists()).toBe(false)

    session.loggedIn.value = true
    const member = await mountBand()
    expect(member.find('h2').text()).toBe('Οι πόντοι σου')
  })

  it('decides from the feature alone: the plan flag cannot close it', async () => {
    setTenant({ loyaltyEnabled: false, storeName: 'Demo' })
    setTenantFeatures({ loyalty: true })

    const wrapper = await mountBand()

    expect(wrapper.find('section').exists()).toBe(true)
  })
})
