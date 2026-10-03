import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { h, ref } from 'vue'
import AccountShell from '~/components/Chrome/AccountShell.vue'
import { makeTier } from '~~/test/fixtures/loyalty'

/**
 * The account area's frame: the ink band (name, standing, figures), the
 * sidebar of account pages, signing out, and — off the overview — the
 * way back to it on a phone. A figure shows only while the navigation
 * offers its page, so a store that switched a programme off never sees
 * it quoted.
 */
const state = vi.hoisted(() => ({
  keys: [] as string[],
  onOverview: true,
  summary: {} as Record<string, unknown>,
}))
const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))

mockNuxtImport('useAccountNavigation', () => () => ({
  items: computed(() => state.keys.map(key => ({
    key,
    label: `label:${key}`,
    icon: 'i-lucide-house',
    to: `/account/${key}`,
    active: key === 'orders',
    ...(key === 'notifications' ? { badge: 3 } : {}),
  }))),
  onOverview: computed(() => state.onOverview),
}))
mockNuxtImport('useSignOut', () => () => ({ signOut, signingOut: ref(false) }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7, email: 'demo@grooveshop.space', firstName: 'Δήμος', lastName: 'Δοκιμής', createdAt: '2025-03-14T10:00:00Z', mainImagePath: '' }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const SILVER = makeTier({ id: 2 })

beforeEach(() => {
  state.keys = ['overview', 'orders', 'notifications', 'rewards', 'gift_cards', 'business']
  state.onOverview = true
  state.summary = { ordersCount: 14, loyalty: { pointsBalance: 2340, tier: SILVER }, giftCardBalance: 42, businessStatus: 'APPROVED' }
  clearNuxtData('account-summary')
  registerEndpoint('/api/user/account/summary', () => state.summary)
})

async function mountShell() {
  const wrapper = await mountSuspended(AccountShell, { slots: { default: () => h('p', { id: 'page' }, 'σελίδα') } })
  // The summary is lazy: it lands after the shell has rendered.
  await vi.waitFor(() => expect(wrapper.find('dl').exists()).toBe(true))
  await flushPromises()
  return wrapper
}

const figures = (wrapper: Awaited<ReturnType<typeof mountShell>>) =>
  wrapper.findAll('dl > div').map(figure => [figure.get('dd').text(), figure.get('dt').text()])

describe('Chrome/AccountShell', () => {
  it('names the shopper with their tier, business standing and how long they have been a member', async () => {
    const wrapper = await mountShell()
    const band = wrapper.get('section')

    expect(band.text()).toContain('Δήμος Δοκιμής')
    expect(band.text()).toContain(extractTranslated(SILVER, 'name', 'el'))
    expect(band.text()).toContain('B2B')
    expect(band.get('time').attributes('datetime')).toBe('2025-03-14T10:00:00.000Z')
  })

  it('quotes points, orders and the gift-card balance', async () => {
    const { n } = useNuxtApp().$i18n

    expect(figures(await mountShell())).toEqual([
      ['2.340', 'πόντοι'],
      ['14', 'παραγγελίες'],
      [n(42, 'currency'), 'υπόλοιπο δωροκαρτών'],
    ])
  })

  it('quotes no points, tier or balance for programmes the navigation does not offer', async () => {
    state.keys = ['overview', 'orders']

    const wrapper = await mountShell()

    expect(figures(wrapper)).toEqual([['14', 'παραγγελίες']])
    expect(wrapper.get('section').text()).not.toContain(extractTranslated(SILVER, 'name', 'el'))
    expect(wrapper.get('section').text()).not.toContain('B2B')
  })

  it('calls a pending business profile nothing yet', async () => {
    state.summary = { ...state.summary, businessStatus: 'PENDING' }

    expect((await mountShell()).get('section').text()).not.toContain('B2B')
  })

  it('lists the account pages, the one on screen marked current, with the unseen count', async () => {
    const wrapper = await mountShell()
    const links = wrapper.findAll('nav ul a')

    expect(links.map(link => link.attributes('href'))).toEqual(state.keys.map(key => `/account/${key}`))
    expect(links.filter(link => link.attributes('aria-current') === 'page').map(link => link.text())).toEqual(['label:orders'])
    expect(links.find(link => link.text().startsWith('label:notifications'))!.text()).toBe('label:notifications3')
  })

  it('signs out from the sidebar', async () => {
    const wrapper = await mountShell()

    await wrapper.get('nav button').trigger('click')

    expect(signOut).toHaveBeenCalled()
  })

  it('renders the page inside, with a way back to the overview off it', async () => {
    state.onOverview = false

    const wrapper = await mountShell()

    expect(wrapper.find('#page').exists()).toBe(true)
    expect(wrapper.findAll('a').some(link => link.attributes('href') === useLocalePath()('account') && link.text() === 'Λογαριασμός')).toBe(true)
  })

  it('needs no way back on the overview itself', async () => {
    const wrapper = await mountShell()

    expect(wrapper.findAll('a').some(link => link.text() === 'Λογαριασμός')).toBe(false)
  })
})
