import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, reactive } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import Navbar from '~/components/Chrome/variants/ekfyseosfyteias/Navbar.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * «Εκ φύσεως Φυτειάς» header. What it must get right:
 *
 * - the page links are the operator's `NavigationMenu` header rows, the
 *   current page marked with `aria-current` and nothing else;
 * - the phone button is the published phone, as a `tel:` link a phone
 *   can dial, and absent for a store that published none;
 * - on a phone the menu button opens and closes the same links, closes on
 *   Escape (focus back on the button) and when the route changes;
 * - the logo renders only when the store has one, so the name is not
 *   printed twice;
 * - the dark-theme switch is on the bar and in the phone menu.
 */
const state = vi.hoisted(() => ({
  header: [] as { label: string, to?: string }[] | null,
  /** `useNavigation().mobileLinks`: the Mobile menu, else the Header menu (that composable's spec). */
  phoneLinks: [] as { label: string, to?: string }[] | null,
  phone: '',
  logo: '/media/seal.png',
  route: null as unknown as { path: string, fullPath: string },
}))

mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => state.header),
  footerColumns: computed(() => null),
  mobileLinks: computed(() => state.phoneLinks),
}))
mockNuxtImport('useMerchantIdentity', () => () => ({
  identity: computed(() => ({ phone: state.phone })),
}))
mockNuxtImport('useTenantBranding', () => () => ({
  logoLightUrl: computed(() => state.logo),
}))
mockNuxtImport('useRoute', () => () => state.route)

const stubs = { TenantLogo: { template: '<img data-test="logo" alt="">' } }

/** The navbar's own copy (el), which the global `$i18n` cannot reach. */
const COPY = { menu: 'Μενού', navigation: 'Κύριο μενού' }

const PAGES = [
  { label: 'Το κελάρι μας', to: '/products' },
  { label: 'Επικοινωνία', to: '/contact' },
]

const mountNavbar = () =>
  mountSuspended(Navbar, { route: false, attachTo: document.body, global: { stubs } })

const desktopNav = (wrapper: VueWrapper) => wrapper.find('nav:not(#fy-mobile-menu)')
const mobilePanel = (wrapper: VueWrapper) => wrapper.find('#fy-mobile-menu')
const menuButton = (wrapper: VueWrapper) => wrapper.find(`button[aria-label="${COPY.menu}"]`)

describe('Chrome/variants/ekfyseosfyteias/Navbar', () => {
  beforeEach(() => {
    state.header = PAGES
    state.phoneLinks = PAGES
    state.phone = '698 162 7561'
    state.logo = '/media/seal.png'
    state.route = reactive({ path: '/', fullPath: '/' })
    setTenant({ storeName: 'Εκ φύσεως Φυτειάς' })
  })

  it('lists the operator\'s pages under the store\'s name', async () => {
    const wrapper = await mountNavbar()

    expect(wrapper.text()).toContain('Εκ φύσεως Φυτειάς')
    const links = desktopNav(wrapper).findAll('a')
    expect(links.map(link => [link.text(), link.attributes('href')])).toEqual([
      ['Το κελάρι μας', '/products'],
      ['Επικοινωνία', '/contact'],
    ])
    expect(desktopNav(wrapper).attributes('aria-label')).toBe(COPY.navigation)
  })

  it('lists the phone links in the phone panel, and keeps the Header menu on the bar', async () => {
    state.phoneLinks = [{ label: 'Μενού κινητού', to: '/about' }]

    const wrapper = await mountNavbar()

    expect(mobilePanel(wrapper).findAll('a').map(link => link.attributes('href')).slice(0, 1))
      .toEqual(['/about'])
    expect(desktopNav(wrapper).findAll('a').map(link => link.attributes('href')))
      .toEqual(['/products', '/contact'])
  })

  it('marks only the page the visitor is on', async () => {
    state.route = reactive({ path: '/products/category/3/jams', fullPath: '/products/category/3/jams' })

    const wrapper = await mountNavbar()

    const current = desktopNav(wrapper).findAll('a')
      .map(link => [link.text(), link.attributes('aria-current')])
    expect(current).toEqual([['Το κελάρι μας', 'page'], ['Επικοινωνία', undefined]])
  })

  it('renders no navigation when the store configured no header links', async () => {
    state.header = null
    state.phoneLinks = null

    const wrapper = await mountNavbar()

    expect(desktopNav(wrapper).exists()).toBe(false)
    expect(mobilePanel(wrapper).findAll('a').map(link => link.attributes('href')))
      .toEqual(['tel:6981627561'])
  })

  describe('the phone button', () => {
    it('dials the published number, without its spaces', async () => {
      const wrapper = await mountNavbar()

      const calls = wrapper.findAll('a[href^="tel:"]')
      expect(calls.map(link => link.attributes('href'))).toEqual(['tel:6981627561', 'tel:6981627561'])
      expect(calls[0]!.text()).toBe('698 162 7561')
      expect(calls[1]!.text()).toContain('698 162 7561')
    })

    it('is left out when the store published no phone', async () => {
      state.phone = ''

      const wrapper = await mountNavbar()

      expect(wrapper.find('a[href^="tel:"]').exists()).toBe(false)
    })
  })

  it('draws the logo only when the store has one', async () => {
    expect((await mountNavbar()).find('[data-test="logo"]').exists()).toBe(true)

    state.logo = ''

    expect((await mountNavbar()).find('[data-test="logo"]').exists()).toBe(false)
  })

  it('offers the dark-theme switch on the bar and inside the phone menu', async () => {
    const wrapper = await mountNavbar()

    await vi.waitFor(() => expect(wrapper.findAll('button[aria-pressed]')).toHaveLength(2))
    expect(mobilePanel(wrapper).find('button[aria-pressed]').exists()).toBe(true)
    expect(desktopNav(wrapper).element.parentElement!.querySelector('button[aria-pressed]')).not.toBeNull()
  })

  it('offers the language switch on the bar and inside the phone menu when the store serves two languages', async () => {
    setTenant({ storeName: 'Εκ φύσεως Φυτειάς', availableLocales: ['el', 'en'] })

    const wrapper = await mountNavbar()

    expect(mobilePanel(wrapper).find('a[hreflang="en"]').exists()).toBe(true)
    expect(desktopNav(wrapper).element.parentElement!.querySelector('a[hreflang="en"]')).not.toBeNull()
  })

  describe('the menu on a phone', () => {
    it('starts closed and opens and closes with its button', async () => {
      const wrapper = await mountNavbar()
      const button = menuButton(wrapper)

      expect(button.attributes('aria-expanded')).toBe('false')
      expect(button.attributes('aria-controls')).toBe('fy-mobile-menu')
      expect(mobilePanel(wrapper).isVisible()).toBe(false)

      await button.trigger('click')

      expect(button.attributes('aria-expanded')).toBe('true')
      expect(mobilePanel(wrapper).isVisible()).toBe(true)

      await button.trigger('click')

      expect(button.attributes('aria-expanded')).toBe('false')
      expect(mobilePanel(wrapper).isVisible()).toBe(false)
    })

    it('closes on Escape and gives the focus back to the button', async () => {
      const wrapper = await mountNavbar()
      const button = menuButton(wrapper)
      await button.trigger('click')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await vi.waitFor(() => expect(mobilePanel(wrapper).isVisible()).toBe(false))

      expect(document.activeElement).toBe(button.element)
    })

    it('closes when the route changes', async () => {
      const wrapper = await mountNavbar()
      await menuButton(wrapper).trigger('click')

      state.route.path = '/contact'
      state.route.fullPath = '/contact'

      await vi.waitFor(() => expect(mobilePanel(wrapper).isVisible()).toBe(false))
      expect(menuButton(wrapper).attributes('aria-expanded')).toBe('false')
    })
  })
})
