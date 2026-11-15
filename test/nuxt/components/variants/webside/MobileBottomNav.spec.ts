import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import MobileBottomNav from '~/components/variants/webside/MobileBottomNav.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * Webside's phone tab bar: which tabs a visitor gets and where they
 * lead (each tab's own rules are `useBottomNavItems`'s spec), and that
 * the bar docks: the sticky add-to-cart bar, the assistant and the
 * cookie notice read its height from `data-dock`
 * (`app/assets/css/main.css`), so a bar that stops marking itself would
 * let them sit under it again.
 */
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

// Rendered on every width in the test environment.
const stubs = { MobileOrTabletOnly: { template: '<div><slot /></div>' } }

const mountNav = (props: { includeCart?: boolean } = {}) =>
  mountSuspended(MobileBottomNav, { route: '/', props, global: { stubs } })

const t = (key: string) => useNuxtApp().$i18n.t(key)

/** The tabs as a visitor meets them: name and destination. */
const tabs = (wrapper: Awaited<ReturnType<typeof mountNav>>) =>
  wrapper.findAll('nav a').map(link => [link.text(), link.attributes('href')])

describe('webside MobileBottomNav', () => {
  beforeEach(async () => {
    setTenant()
    setTenantFeatures({ catalogue: true, blog: true, cart: true })
    await useCartStore().cleanCartState()
    useCartStore().cart = makeCart({ totalItems: 0 })
  })

  it('leads to Home, the shop, the blog, the cart and sign-in, in that order', async () => {
    const wrapper = await mountNav()

    expect(tabs(wrapper)).toEqual([
      [t('home'), '/'],
      [t('shop'), '/products'],
      [t('blog'), '/blog'],
      [t('cart.title'), '/cart'],
      [t('account'), '/account/login?next=/'],
    ])
  })

  it('draws the cart with the cart icon of the header and the buy button, and its count', async () => {
    useCartStore().cart = makeCart({ totalItems: 2 })

    const wrapper = await mountNav()
    const cart = wrapper.find('nav a[href="/cart"]')

    expect(cart.find('.i-heroicons\\:shopping-cart').exists()).toBe(true)
    expect(cart.text()).toContain('2')
  })

  it('leaves the cart out where the layout asks it to', async () => {
    const wrapper = await mountNav({ includeCart: false })

    expect(tabs(wrapper).map(([, href]) => href)).not.toContain('/cart')
  })

  // The classes are the contract: happy-dom lays nothing out. Five tabs
  // in equal columns (64px at 320), each label (10px at 320, 11px from 360) on one line in its column.
  it('shares the bar\'s width between its tabs in equal columns', async () => {
    const wrapper = await mountNav()

    const items = wrapper.findAll('nav [data-slot="item"]')
    expect(items).toHaveLength(5)
    for (const item of items) {
      expect(item.classes()).toEqual(expect.arrayContaining(['min-w-0', 'flex-1']))
      expect(item.classes()).not.toContain('w-full')
      expect(item.get('[data-slot="link"]').classes()).toContain('px-0')
      expect(item.get('[data-slot="linkLabel"]').classes()).toEqual(expect.arrayContaining(['tracking-tight', 'text-[0.625rem]', 'min-[22.5rem]:text-[0.6875rem]']))
    }
  })

  it('is named in the page\'s language', async () => {
    const wrapper = await mountNav()

    expect(wrapper.find('nav').attributes('aria-label')).toBe('Γρήγορη πλοήγηση')
  })

  it('docks as an edge-to-edge tab bar, so what is fixed above it stacks on it', async () => {
    const wrapper = await mountNav()
    const bar = wrapper.find('nav')

    expect([bar.attributes('data-dock'), bar.attributes('data-dock-flush')]).toEqual(['tabbar', ''])
  })

  it('leaves the dock while the on-screen keyboard is open', async () => {
    const viewport = new EventTarget() as EventTarget & { height: number }
    viewport.height = window.innerHeight - 300
    vi.stubGlobal('visualViewport', viewport)

    const wrapper = await mountNav()

    expect(wrapper.find('nav').attributes('data-dock')).toBeUndefined()
  })
})
