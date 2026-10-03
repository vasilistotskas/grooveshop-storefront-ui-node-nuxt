import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import OverviewPage from '~/components/Storefront/Account/Overview.vue'
import { makeOrderItem, makeOrderListItem } from '~~/test/fixtures/order'

/**
 * The account overview: the latest order, the rewards card while the
 * programme is offered, the profile at a glance, and — on a phone — the
 * account's pages as tiles and signing out.
 */
const state = vi.hoisted(() => ({ keys: [] as string[], orders: [] as unknown[] }))
const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))

mockNuxtImport('useAccountNavigation', () => () => ({
  items: computed(() => state.keys.map(key => ({ key, label: `label:${key}`, icon: 'i-lucide-house', to: `/account/${key}`, active: false, ...(key === 'notifications' ? { badge: 2 } : {}) }))),
  onOverview: computed(() => true),
}))
mockNuxtImport('useSignOut', () => () => ({ signOut, signingOut: ref(false) }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7, email: 'demo@grooveshop.space', firstName: 'Δήμος', lastName: 'Δοκιμής', username: 'demo', phone: '+306900000000', city: 'Θεσσαλονίκη', country: 'GR' }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

beforeEach(() => {
  state.keys = ['overview', 'orders', 'notifications', 'rewards']
  state.orders = [makeOrderListItem({
    id: 3,
    status: 'SHIPPED',
    statusDisplay: 'Απεστάλη',
    paidAmount: 65.48,
    items: [makeOrderItem({ id: 1, quantity: 1 }), makeOrderItem({ id: 2, quantity: 2 })],
  })]
  clearNuxtData('account-latest-order')
  registerEndpoint('/api/orders/my-orders', () => ({ count: state.orders.length, results: state.orders }))
})

async function mountPage() {
  const wrapper = await mountSuspended(OverviewPage, {
    global: { stubs: { LoyaltyRewardsCard: { template: '<div data-testid="rewards" />' } } },
  })
  await flushPromises()
  return wrapper
}

describe('Storefront/Account/Overview', () => {
  it('greets the shopper by first name', async () => {
    expect((await mountPage()).get('h1').text()).toBe('Καλώς ήρθες ξανά, Δήμος')
  })

  it('shows the latest order with its status, items and total, linked to its page', async () => {
    const wrapper = await mountPage()
    const order = wrapper.get('[aria-labelledby="latest-order-title"]')

    expect(order.text()).toContain('#3')
    expect(order.text()).toContain('Απεστάλη')
    expect(order.text()).toContain('3 προϊόντα')
    expect(order.text()).toContain(useNuxtApp().$i18n.n(65.48, 'currency'))
    expect(order.findAll('a').map(link => link.attributes('href'))).toContain(
      useLocalePath()({ name: 'account-orders-id', params: { id: 3 } }),
    )
  })

  it('invites a shopper without orders to start shopping', async () => {
    state.orders = []

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Δεν έχεις κάνει ακόμα καμία παραγγελία.')
    expect(wrapper.text()).not.toContain('Όλες οι παραγγελίες')
  })

  it('shows the rewards card only while the programme is offered', async () => {
    expect((await mountPage()).find('[data-testid="rewards"]').exists()).toBe(true)

    state.keys = ['overview', 'orders']
    expect((await mountPage()).find('[data-testid="rewards"]').exists()).toBe(false)
  })

  it('tiles every account page but the overview, with the unseen count', async () => {
    const wrapper = await mountPage()
    const tiles = wrapper.findAll('nav li a')

    expect(tiles.map(tile => tile.attributes('href'))).toEqual(['/account/orders', '/account/notifications', '/account/rewards'])
    expect(tiles[1]!.text()).toBe('label:notifications2')
  })

  it('shows the profile at a glance, linked to its form', async () => {
    const wrapper = await mountPage()
    const profile = wrapper.get('[aria-labelledby="profile-title"]')

    expect(profile.findAll('dd').map(value => value.text())).toEqual(['demo@grooveshop.space', '+306900000000', 'demo', 'Θεσσαλονίκη, GR'])
    expect(profile.get('a').attributes('href')).toBe(useLocalePath()('account-settings'))
  })

  it('signs out', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text() === 'Αποσύνδεση')!.trigger('click')

    expect(signOut).toHaveBeenCalled()
  })
})
