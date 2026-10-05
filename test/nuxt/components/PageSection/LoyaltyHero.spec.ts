import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import LoyaltyHero from '~/components/PageSection/LoyaltyHero.vue'
import { setTenant } from '~~/test/helpers/tenant'
import { makeTier } from '~~/test/fixtures/loyalty'

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

const SETTINGS_URL = '/api/loyalty/settings'
const TIERS_URL = '/api/loyalty/tiers'

const TIERS = [
  makeTier({ id: 1, requiredLevel: 1, pointsMultiplier: 1 }),
  makeTier({ id: 2, requiredLevel: 5, pointsMultiplier: 1.25, translations: { el: { name: 'Ασημένιο' }, en: { name: 'Silver' } } }),
  makeTier({ id: 3, requiredLevel: 15, pointsMultiplier: 2, translations: { el: { name: 'Πλατινένιο' }, en: { name: 'Platinum' } } }),
]

/** The store's loyalty settings as the settings route answers them: strings. */
const settings = (overrides: Record<string, string> = {}) => ({
  LOYALTY_ENABLED: 'true',
  LOYALTY_POINTS_FACTOR: '1',
  LOYALTY_REDEMPTION_RATIO_EUR: '100',
  LOYALTY_TIER_MULTIPLIER_ENABLED: 'true',
  LOYALTY_NEW_CUSTOMER_BONUS_ENABLED: 'true',
  LOYALTY_NEW_CUSTOMER_BONUS_POINTS: '100',
  ...overrides,
})

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
 * plan and runtime switches gate it, the requests included.
 */
describe('PageSection/LoyaltyHero', () => {
  beforeEach(() => {
    clearNuxtData(['loyalty-settings', 'loyalty-tiers'])
    if (session.loggedIn) session.loggedIn.value = false
    setTenant({ loyaltyEnabled: true, storeName: 'Demo' })
    api.routes({ [SETTINGS_URL]: settings(), [TIERS_URL]: TIERS })
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
    api.routes({
      [SETTINGS_URL]: settings({ LOYALTY_TIER_MULTIPLIER_ENABLED: 'false', LOYALTY_NEW_CUSTOMER_BONUS_ENABLED: 'false', LOYALTY_POINTS_FACTOR: '1.5' }),
      [TIERS_URL]: TIERS,
    })

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

  it('asks for nothing and renders nothing on a plan without the programme', async () => {
    setTenant({ loyaltyEnabled: false })

    const wrapper = await mountBand()

    expect(api.callsTo(SETTINGS_URL)).toEqual([])
    expect(api.callsTo(TIERS_URL)).toEqual([])
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('renders nothing where the merchant has switched the programme off', async () => {
    api.routes({ [SETTINGS_URL]: settings({ LOYALTY_ENABLED: 'false' }), [TIERS_URL]: TIERS })

    const wrapper = await mountBand()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
