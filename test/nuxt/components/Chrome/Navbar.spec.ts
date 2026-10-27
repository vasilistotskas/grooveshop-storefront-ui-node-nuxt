import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { NavigationMenuItem } from '@nuxt/ui'
import type { NavLink } from '~/composables/useNavigation'
import type { CategoryMenuEntry } from '~/composables/useCategoryMenu'
import ChromeNavbar from '~/components/Chrome/Navbar.vue'
import MobileMenu from '~/components/Chrome/MobileMenu.vue'
import type { TenantConfig } from '~~/shared/openapi/types.gen'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { state } = vi.hoisted(() => ({
  state: {
    header: null as NavLink[] | null,
    /** `useNavigation().mobileLinks`: the Mobile menu, else the Header menu (that composable's spec). */
    phoneLinks: null as NavLink[] | null,
  },
}))
const session = vi.hoisted(() => ({ loggedIn: undefined as any }))

mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => state.header),
  footerColumns: computed(() => null),
  mobileLinks: computed(() => state.phoneLinks),
}))
const categories = ref<CategoryMenuEntry[]>([])
mockNuxtImport('useCategoryMenu', () => () => ({
  categories,
  hasCategories: computed(() => categories.value.length > 0),
}))
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

/** Everything but the gates under test: each child has its own spec (or none to need). */
const stubs = {
  ChromeAnnouncementBar: true,
  ChromeMegaMenu: true,
  ChromeAccountMenu: true,
  TenantLogo: true,
  CartButton: { template: '<button data-test="cart" />' },
}

/**
 * The search, language switcher, notifications bell and mobile menu are
 * rendered `Lazy…`, which Nuxt compiles to a direct async import that no
 * stub key matches — so the modules those imports load are mocked.
 */
vi.mock('~/components/Search/Input.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/Language/Switcher.vue', () => ({ default: { template: '<div data-test="languages" />' } }))
vi.mock('~/components/User/NotificationsBell.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/Chrome/MobileMenu.vue', () => ({ default: { props: ['items', 'open'], template: '<div />' } }))

const mountNavbar = (route: string | false = false) => mountSuspended(ChromeNavbar, { route, global: { stubs } })

/**
 * The desktop menu is a hover-driven `UNavigationMenu`; the items it is
 * handed (and hands the mobile menu) are the contract, so they are read
 * off it as `[label, to, active]`.
 */
const menu = (wrapper: VueWrapper) =>
  (wrapper.findComponent({ name: 'UNavigationMenu' }).props('items') as NavigationMenuItem[])
    .map(item => [item.label, item.to ?? item.href, item.active])

const t = (key: string) => useNuxtApp().$i18n.t(key)

/**
 * The redesigned header's gates. Offers, the blog, gift cards, loyalty
 * and favourites follow `TenantConfig.features`, Django's effective
 * state, and nothing else; the cart is still a preference.
 */
describe('Chrome/Navbar', () => {
  beforeEach(() => {
    state.header = null
    state.phoneLinks = null
    categories.value = []
    if (session.loggedIn) session.loggedIn.value = false
    setTenant({ availableLocales: ['el'] })
  })

  it.each<{ name: string, tenant: Partial<TenantConfig>, features: Partial<TenantConfig['features']>, links: string[] }>([
    {
      name: 'every feature on',
      tenant: {},
      features: { blog: true, promotions: true, giftCards: true, loyalty: true },
      links: ['/products', '/offers', '/blog', '/gift-cards', '/loyalty-program'],
    },
    {
      name: 'only the features Django turned on',
      tenant: {},
      features: { blog: true, giftCards: true },
      links: ['/products', '/blog', '/gift-cards'],
    },
    {
      name: 'the plan flags on but the features off',
      tenant: { blogEnabled: true, promotionsEnabled: true, giftCardsEnabled: true, loyaltyEnabled: true },
      features: {},
      links: ['/products'],
    },
  ])('gates the platform menu with $name', async ({ tenant, features, links }) => {
    setTenant({ availableLocales: ['el'], ...tenant })
    setTenantFeatures(features)

    const wrapper = await mountNavbar()

    expect(menu(wrapper).map(([, to]) => to)).toEqual(links)
  })

  it('marks the section the visitor is in', async () => {
    const wrapper = await mountNavbar('/products')

    expect(menu(wrapper)).toEqual([[t('shop'), '/products', true]])
  })

  it('replaces the platform menu with the operator\'s, opening external links in a new tab', async () => {
    // The visitor is on a page UNDER the entry's path, so the entry is
    // active by prefix. It must be a real route: Nuxt does not navigate
    // to a path no page matches, it hands it to the browser instead.
    setTenantFeatures({ giftCards: true })
    state.header = [
      { label: 'Δωροκάρτες', to: '/gift-cards' },
      { label: 'Εργαστήριο', href: 'https://workshop.example' },
    ]

    const wrapper = await mountNavbar('/gift-cards/success')

    const items = wrapper.findComponent({ name: 'UNavigationMenu' }).props('items') as NavigationMenuItem[]
    expect(items.map(item => [item.label, item.to, item.href, item.target, item.active])).toEqual([
      ['Δωροκάρτες', '/gift-cards', undefined, undefined, true],
      ['Εργαστήριο', undefined, 'https://workshop.example', '_blank', false],
    ])
  })

  /** The bar's entries and the phone menu's, as `[label, to]`. */
  const menus = async () => {
    const wrapper = await mountNavbar()
    await vi.waitFor(() => expect(wrapper.findComponent(MobileMenu).exists()).toBe(true))
    const entries = (items: NavigationMenuItem[]) => items.map(item => [item.label, item.to])
    return {
      bar: entries(wrapper.findComponent({ name: 'UNavigationMenu' }).props('items')),
      phone: entries(wrapper.findComponent(MobileMenu).props('items')),
    }
  }

  it('hands the phone menu the phone links, while the bar keeps the Header menu', async () => {
    state.header = [{ label: 'Σχετικά', to: '/about' }]
    state.phoneLinks = [{ label: 'Επικοινωνία', to: '/contact' }]

    const { bar, phone } = await menus()

    expect(bar).toEqual([['Σχετικά', '/about']])
    expect(phone).toEqual([['Επικοινωνία', '/contact']])
  })

  it('hands the phone menu the bar\'s own menu while the store configured no links at all', async () => {
    const { bar, phone } = await menus()

    expect(phone).toEqual(bar)
  })

  it('keeps the catalogue on the operator\'s entry for the listing', async () => {
    categories.value = [{ id: 1, slug: 'charging', label: 'Φόρτιση', to: '/products/category/1/charging', imagePath: '', productCount: 0, children: [] }]
    state.header = [
      { label: 'Σχετικά', to: '/about' },
      { label: 'Κατάστημα', to: '/products', icon: 'i-heroicons-shopping-bag' },
    ]

    const wrapper = await mountNavbar()

    const items = wrapper.findComponent({ name: 'UNavigationMenu' }).props('items') as NavigationMenuItem[]
    expect(items.map(item => [item.label, item.to, item.slot, item.children?.map(child => child.to)])).toEqual([
      ['Σχετικά', '/about', undefined, undefined],
      ['Κατάστημα', '/products', 'shop', ['/products/category/1/charging']],
    ])
  })

  it('shows the cart unless the store turned the cart feature off', async () => {
    const shown = await mountNavbar()
    expect(shown.find('[data-test="cart"]').exists()).toBe(true)

    setTenantFeatures({ cart: false })
    const hidden = await mountNavbar()
    expect(hidden.find('[data-test="cart"]').exists()).toBe(false)
  })

  it.each([
    { name: 'a guest to sign in', loggedIn: false, href: '/account/login' },
    { name: 'a member to their favourites', loggedIn: true, href: '/account/favourites/products' },
  ])('sends $name from the favourites button', async ({ loggedIn, href }) => {
    setTenantFeatures({ blog: true })
    session.loggedIn.value = loggedIn

    const wrapper = await mountNavbar()

    expect(wrapper.find(`a[aria-label="${t('favourites')}"]`).attributes('href')).toBe(href)
  })

  it('offers favourites whether or not the store runs a blog', async () => {
    // Favourites are products; the button used to hide with the blog.
    setTenantFeatures({ blog: false })

    const wrapper = await mountNavbar()

    expect(wrapper.find(`a[aria-label="${t('favourites')}"]`).exists()).toBe(true)
  })

  it('opens the catalogue panel from Shop, and dims the page under it', async () => {
    categories.value = [{ id: 1, slug: 'charging', label: 'Φόρτιση', to: '/products/category/1/charging', imagePath: '', productCount: 0, children: [] }]

    const wrapper = await mountNavbar()
    const nav = wrapper.findComponent({ name: 'UNavigationMenu' })
    const shop = (nav.props('items') as NavigationMenuItem[])[0]!

    expect([shop.slot, shop.value, shop.children?.map(child => child.to)])
      .toEqual(['shop', 'shop', ['/products/category/1/charging']])
    expect(wrapper.find('.bg-\\(--ui-scrim\\)').exists()).toBe(false)

    await nav.vm.$emit('update:modelValue', 'shop')

    expect(wrapper.find('.bg-\\(--ui-scrim\\)').exists()).toBe(true)
  })

  it('draws no favourites button when the store lacks the favourites feature', async () => {
    setTenantFeatures({ blog: true, favourites: false })

    const wrapper = await mountNavbar()

    expect(wrapper.find(`[aria-label="${t('favourites')}"]`).exists()).toBe(false)
  })

  it('offers the language switcher only to a store that serves more than one locale', async () => {
    const single = await mountNavbar()
    expect(single.find('[data-test="languages"]').exists()).toBe(false)

    setTenant({ availableLocales: ['el', 'en'] })
    const multi = await mountNavbar()
    await vi.waitFor(() => expect(multi.find('[data-test="languages"]').exists()).toBe(true))
  })
})
