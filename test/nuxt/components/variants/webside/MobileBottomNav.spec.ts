import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import MobileBottomNav from '~/components/variants/webside/MobileBottomNav.vue'

/**
 * Webside's phone tab bar. Its entries are `useBottomNavItems` (own spec);
 * here, which tabs webside asks for, and that the bar docks: the sticky
 * add-to-cart bar, the assistant and the cookie notice read its height
 * from `data-dock` (`app/assets/css/main.css`), so a bar that stops
 * marking itself would let them sit under it again.
 */
const { nav } = vi.hoisted(() => ({
  nav: { options: undefined as Parameters<typeof useBottomNavItems>[0] },
}))

mockNuxtImport('useBottomNavItems', () => (options: Parameters<typeof useBottomNavItems>[0]) => {
  nav.options = options
  return { items: computed(() => [{ label: 'Αρχική', icon: 'i-heroicons-home', to: '/', active: true }]) }
})
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
  mountSuspended(MobileBottomNav, { route: false, props, global: { stubs } })

describe('webside MobileBottomNav', () => {
  beforeEach(() => {
    nav.options = undefined
  })

  it('asks for Home, Shop, Blog, Cart and Account, with the cart icon of its header and buy button', async () => {
    await mountNav()

    expect(nav.options).toMatchObject({
      tabs: ['home', 'shop', 'blog', 'cart', 'account'],
      icons: { cart: 'i-heroicons-shopping-cart' },
      accountAvatar: true,
      includeCart: true,
    })
  })

  it('hands on the layout\'s word about the cart', async () => {
    await mountNav({ includeCart: false })

    expect(nav.options?.includeCart).toBe(false)
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
