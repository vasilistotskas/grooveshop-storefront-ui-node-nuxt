import { afterEach, describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { NavigationMenuItem } from '@nuxt/ui'
import type { NavLink } from '~~/shared/types/navigation'
import type { CategoryMenuEntry } from '~/composables/useCategoryMenu'
import type { BlogCategoryMenuEntry } from '~/composables/useBlogCategoryMenu'
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
const topics = ref<BlogCategoryMenuEntry[]>([])
mockNuxtImport('useBlogCategoryMenu', () => () => ({
  blogCategories: topics,
  hasBlogCategories: computed(() => topics.value.length > 0),
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
vi.mock('~/components/Search/Input.vue', () => ({ default: { template: '<div data-test="search" />' } }))
vi.mock('~/components/Language/Switcher.vue', () => ({ default: { template: '<div data-test="languages" />' } }))
vi.mock('~/components/User/NotificationsBell.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/Chrome/MobileMenu.vue', () => ({ default: { props: ['items', 'open'], template: '<div />' } }))

const mountNavbar = (route: string | false = false) => mountSuspended(ChromeNavbar, { route, global: { stubs } })

/**
 * The desktop menu is a hover-driven `UNavigationMenu`; the items it is
 * handed (and hands the mobile menu) are the contract, so they are read
 * off it as `[label, to, active]`.
 */
/**
 * The bar's entries as sections: each section's panel button (no `to`,
 * a panel) folded back into the link before it, so a test reads one
 * entry per section. The split itself has its own tests.
 */
const barEntries = (wrapper: VueWrapper): NavigationMenuItem[] => {
  const out: NavigationMenuItem[] = []
  for (const item of wrapper.findComponent({ name: 'UNavigationMenu' }).props('items') as NavigationMenuItem[]) {
    const previous = out.at(-1)
    if (previous && !item.to && !item.href && (item.slot || item.children)) {
      out[out.length - 1] = { ...previous, slot: item.slot, children: item.children, value: item.value }
    }
    else {
      out.push(item)
    }
  }
  return out
}

const menu = (wrapper: VueWrapper) =>
  barEntries(wrapper).map(item => [item.label, item.to ?? item.href, item.active])

const t = (key: string) => useNuxtApp().$i18n.t(key)

/** The header's own name for the button that opens the Shop panel. */
const OPEN_SHOP = 'Μενού: Κατάστημα'

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
    topics.value = []
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

  // The listing and search 404 without the catalogue (the gated-routes
  // table): neither the Shop entry nor the search field is drawn.
  it.each([
    { catalogue: true, drawn: true },
    { catalogue: false, drawn: false },
  ])('draws Shop and the search field: $drawn when the catalogue is $catalogue', async ({ catalogue, drawn }) => {
    setTenantFeatures({ catalogue })

    const wrapper = await mountNavbar()
    await vi.waitFor(() => expect(wrapper.find('[data-test="search"]').exists()).toBe(drawn))

    expect(menu(wrapper).some(([, to]) => to === '/products')).toBe(drawn)
  })

  it('links no gift cards on a store without the catalogue they are bought from', async () => {
    setTenantFeatures({ giftCards: true, catalogue: false })

    const wrapper = await mountNavbar()

    expect(menu(wrapper).map(([, to]) => to)).not.toContain('/gift-cards')
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

    const items = barEntries(wrapper)
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
      bar: entries(barEntries(wrapper)),
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
    categories.value = [{ id: 1, slug: 'charging', label: 'Φόρτιση', to: '/products/category/1/charging', imagePath: '', imageAlt: '', productCount: 0, children: [] }]
    state.header = [
      { label: 'Σχετικά', to: '/about' },
      { label: 'Κατάστημα', to: '/products', icon: 'i-heroicons-shopping-bag' },
    ]

    const wrapper = await mountNavbar()

    const items = barEntries(wrapper)
    expect(items.map(item => [item.label, item.to, item.slot, item.children?.map(child => child.to)])).toEqual([
      ['Σχετικά', '/about', undefined, undefined],
      ['Κατάστημα', '/products', 'shop', ['/products/category/1/charging']],
    ])
  })

  /** The blog's own copy, which the global `$i18n` cannot reach. */
  const BLOG_COPY = { allArticles: 'Όλα τα άρθρα', articles: '26 άρθρα' }
  const MOBILE: BlogCategoryMenuEntry = { id: 7, label: 'Κινητό', to: '/blog/category/7/mobile', imagePath: '', postCount: 26 }

  it('opens the blog\'s topics from Blog, "all articles" first, each with its post count', async () => {
    setTenantFeatures({ blog: true })
    topics.value = [MOBILE]

    const wrapper = await mountNavbar()

    const blog = barEntries(wrapper)
      .find(item => item.to === '/blog')!
    expect(blog.children?.map(child => [child.label, child.to, child.description])).toEqual([
      [BLOG_COPY.allArticles, '/blog', undefined],
      ['Κινητό', '/blog/category/7/mobile', BLOG_COPY.articles],
    ])
  })

  it('leaves Blog a plain link while the blog has no topics to list', async () => {
    setTenantFeatures({ blog: true })

    const wrapper = await mountNavbar()

    const blog = barEntries(wrapper)
      .find(item => item.to === '/blog')!
    expect(blog.children).toBeUndefined()
  })

  it('keeps the topics on the operator\'s entry for the blog', async () => {
    topics.value = [MOBILE]
    state.header = [{ label: 'Άρθρα', to: '/blog' }]

    const wrapper = await mountNavbar()

    const items = barEntries(wrapper)
    expect(items.map(item => [item.label, item.to, item.children?.map(child => child.to)])).toEqual([
      ['Άρθρα', '/blog', ['/blog', '/blog/category/7/mobile']],
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
    { name: 'a guest to sign in', loggedIn: false, href: '/account/login?next=/products' },
    { name: 'a member to their favourites', loggedIn: true, href: '/account/favourites/products' },
  ])('sends $name from the favourites button', async ({ loggedIn, href }) => {
    setTenantFeatures({ blog: true })
    session.loggedIn.value = loggedIn

    const wrapper = await mountNavbar('/products')

    expect(wrapper.find(`a[aria-label="${t('favourites')}"]`).attributes('href')).toBe(href)
  })

  it('offers favourites whether or not the store runs a blog', async () => {
    // Favourites are products; the button used to hide with the blog.
    setTenantFeatures({ blog: false })

    const wrapper = await mountNavbar()

    expect(wrapper.find(`a[aria-label="${t('favourites')}"]`).exists()).toBe(true)
  })

  // WCAG 2.1.1: a panel a keyboard cannot reach is content a keyboard
  // cannot use. Each section is its link plus a button that opens its
  // panel; the button is what a keyboard acts on.
  it('lets a keyboard open a section\'s panel, move into it and close it again', async () => {
    const wrapper = await mountSuspended(ChromeNavbar, { route: false, attachTo: document.body, global: { stubs: { ...stubs, ChromeMegaMenu: { template: '<div><a href="/products">all</a><a href="/products?sort=-createdAt">new</a></div>' } } } })
    const link = wrapper.find('a[data-slot="link"][href="/products"]')
    const button = wrapper.findAll<HTMLButtonElement>('button[data-slot="link"]').find(control => control.text() === OPEN_SHOP)!

    // The section's own page stays one plain link away.
    expect(link.text()).toBe(t('shop'))
    expect([button.attributes('href'), button.attributes('aria-expanded')]).toEqual([undefined, 'false'])

    // Enter and Space on a button are its click.
    button.element.focus()
    await button.trigger('click')
    await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('true'))
    const panel = wrapper.find(`#${button.attributes('aria-controls')}`)
    expect(panel.findAll('a').length).toBeGreaterThan(1)

    // ArrowDown moves into the panel; Escape closes it and comes back.
    await button.trigger('keydown', { key: 'ArrowDown' })
    await vi.waitFor(() => expect(panel.element.contains(document.activeElement)).toBe(true))
    await wrapper.find(`#${button.attributes('aria-controls')}`).trigger('keydown', { key: 'Escape' })
    await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('false'))
    expect(document.activeElement).toBe(button.element)
  })

  // The section's NAME is the bigger target, and the entry the design
  // draws: hovering it opens the panel its button opens (`useMenuPanels`),
  // through the menu's one open state.
  describe('the mouse on a section\'s name', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    const hoverable = async () => {
      const wrapper = await mountSuspended(ChromeNavbar, { route: false, attachTo: document.body, global: { stubs: { ...stubs, ChromeMegaMenu: { template: '<div><a href="/products">all</a><a href="/products?sort=-createdAt">new</a></div>' } } } })
      const name = wrapper.get('a[data-slot="link"][href="/products"]')
      const button = wrapper.findAll('button[data-slot="link"]').find(control => control.text() === OPEN_SHOP)!
      // The element around the menu that the mouse's handlers sit on.
      const around = new DOMWrapper(wrapper.get('nav[data-slot="root"]').element.parentElement!)
      return { wrapper, name, button, around }
    }

    it('opens the section\'s panel', async () => {
      const { wrapper, name, button } = await hoverable()

      await name.trigger('pointermove', { pointerType: 'mouse' })

      await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('true'))
      expect(wrapper.get(`#${button.attributes('aria-controls')}`).findAll('a').length).toBeGreaterThan(1)
    })

    it('keeps it open across the button and into the panel, and closes it once the mouse has left', async () => {
      const { wrapper, name, button, around } = await hoverable()
      await name.trigger('pointermove', { pointerType: 'mouse' })
      await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('true'))
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

      // Name, then its button, then the panel: no gap closes it.
      await button.trigger('pointermove', { pointerType: 'mouse' })
      await wrapper.get(`#${button.attributes('aria-controls')}`).find('a').trigger('pointermove', { pointerType: 'mouse' })
      await vi.advanceTimersByTimeAsync(500)
      expect(button.attributes('aria-expanded')).toBe('true')

      await around.trigger('pointerleave', { pointerType: 'mouse' })
      await vi.advanceTimersByTimeAsync(500)
      expect(button.attributes('aria-expanded')).toBe('false')
    })

    // One hover state: Reka's own (its trigger's and its panel's leave,
    // each closing 150ms later) is off on these menus, or it would shut a
    // panel the name had just taken over.
    it('keeps it open when the mouse comes back to the name from the button or the panel', async () => {
      const { wrapper, name, button } = await hoverable()
      await button.trigger('pointermove', { pointerType: 'mouse' })
      await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('true'))
      const panel = wrapper.get(`#${button.attributes('aria-controls')}`)
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

      await button.trigger('pointerleave', { pointerType: 'mouse' })
      await name.trigger('pointermove', { pointerType: 'mouse' })
      await vi.advanceTimersByTimeAsync(500)
      expect(button.attributes('aria-expanded')).toBe('true')

      await panel.trigger('pointerleave', { pointerType: 'mouse' })
      await name.trigger('pointermove', { pointerType: 'mouse' })
      await vi.advanceTimersByTimeAsync(500)
      expect(button.attributes('aria-expanded')).toBe('true')
    })

    it('closes on Escape without moving the focus the mouse never took', async () => {
      const { name, button } = await hoverable()
      const before = document.activeElement
      await name.trigger('pointermove', { pointerType: 'mouse' })
      await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('true'))

      // Cancelable, as a real key press is: Reka checks `defaultPrevented`.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))

      await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('false'))
      expect(document.activeElement).toBe(before)
    })

    // A tap is pointerdown, pointerup, then the tap's click: the wrapper
    // toggles on the pointerup and swallows the click, and Reka's trigger
    // never toggles it back (`useMenuPanels`).
    it('opens on a tap of the button, exactly once', async () => {
      const { button } = await hoverable()

      await button.trigger('pointerdown', { pointerType: 'touch' })
      await button.trigger('pointerup', { pointerType: 'touch' })
      await button.trigger('click')

      await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('true'))
      await flushPromises()
      expect(button.attributes('aria-expanded')).toBe('true')
    })

    // A browser may send no click at all when hydration changed the node
    // under the finger between pointerdown and pointerup: the pointerup alone
    // opens it.
    it('opens on a tap of the button even when no click follows', async () => {
      const { button } = await hoverable()

      await button.trigger('pointerdown', { pointerType: 'touch' })
      await button.trigger('pointerup', { pointerType: 'touch' })

      await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('true'))
    })

    // Reka's trigger guards (`useMenuPanels`): hover opens, a click on
    // the arrow after 300ms closes, and the mouse moving on within the
    // section does not reopen it until it has left and come back.
    it('closes on a click of the arrow and stays closed under the mouse until it leaves the section', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const { name, button, around } = await hoverable()
      await name.trigger('pointermove', { pointerType: 'mouse' })
      await flushPromises()
      expect(button.attributes('aria-expanded')).toBe('true')
      await vi.advanceTimersByTimeAsync(300)

      await button.trigger('click')
      await flushPromises()
      expect(button.attributes('aria-expanded')).toBe('false')
      await button.trigger('pointermove', { pointerType: 'mouse' })
      await name.trigger('pointermove', { pointerType: 'mouse' })
      await flushPromises()
      expect(button.attributes('aria-expanded')).toBe('false')

      await around.trigger('pointerleave', { pointerType: 'mouse' })
      await name.trigger('pointermove', { pointerType: 'mouse' })
      await flushPromises()
      expect(button.attributes('aria-expanded')).toBe('true')
    })

    // The arrow is a real 24px target, and where the pointer is coarse (a
    // touch tablet) 44px tall and as wide as the row allows without moving
    // it: 28px, from the end of its name's word to the next name's box.
    // happy-dom lays nothing out and matches no media query, so the
    // classes are the contract.
    it('makes the arrow a 24px target, and 44px tall and 28px wide for a coarse pointer', async () => {
      const { button } = await hoverable()

      expect(button.classes()).toEqual(expect.arrayContaining(['min-h-6', 'min-w-6', 'justify-center', 'pointer-coarse:min-h-11', 'pointer-coarse:min-w-7', 'pointer-coarse:-ms-3', 'pointer-coarse:-my-0.5']))
      expect(button.get('[data-slot="linkTrailing"]').classes()).toContain('ms-0')
    })

    it('toggles it on a mouse click of the button, once each', async () => {
      const { button } = await hoverable()

      await button.trigger('click')
      await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('true'))
      await button.trigger('click')
      await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('false'))
    })

    // An empty or dangling IDREF is invalid: a closed button names no
    // panel, an open one names the panel that is there.
    it('states aria-controls only while its panel is open, naming that panel', async () => {
      const { wrapper, button } = await hoverable()
      expect(button.attributes()).not.toHaveProperty('aria-controls')

      await button.trigger('click')

      await vi.waitFor(() => expect(button.attributes('aria-expanded')).toBe('true'))
      const controls = button.attributes('aria-controls')!
      expect(controls).not.toBe('')
      expect(wrapper.find(`#${controls}`).exists()).toBe(true)
    })

    it('does not open it for a touch on the name, which navigates', async () => {
      const { name, button } = await hoverable()

      await name.trigger('pointermove', { pointerType: 'touch' })
      await name.trigger('pointerdown', { pointerType: 'touch' })

      expect(button.attributes('aria-expanded')).toBe('false')
    })
  })

  it('opens the catalogue panel from Shop, and dims the page under it', async () => {
    categories.value = [{ id: 1, slug: 'charging', label: 'Φόρτιση', to: '/products/category/1/charging', imagePath: '', imageAlt: '', productCount: 0, children: [] }]

    const wrapper = await mountNavbar()
    const nav = wrapper.findComponent({ name: 'UNavigationMenu' })
    const shop = barEntries(wrapper)[0]!

    expect([shop.slot, shop.value, shop.children?.map(child => child.to)])
      .toEqual(['shop', 'shop', ['/products/category/1/charging']])
    expect(wrapper.find('.bg-\\(--ui-scrim\\)').exists()).toBe(false)

    await nav.vm.$emit('update:modelValue', 'shop')

    expect(wrapper.find('.bg-\\(--ui-scrim\\)').exists()).toBe(true)
  })

  // An entry that opens a dropdown is drawn as its trigger, which Reka
  // never marks current: on a product or an article no entry said where
  // the visitor was.
  it.each([
    { at: '/products', current: () => t('shop') },
    { at: '/blog/categories', current: () => t('blog') },
  ])('marks the dropdown entry of the section the visitor is in, on $at', async ({ at, current }) => {
    setTenantFeatures({ blog: true })
    categories.value = [{ id: 1, slug: 'charging', label: 'Φόρτιση', to: '/products/category/1/charging', imagePath: '', imageAlt: '', productCount: 0, children: [] }]
    topics.value = [{ id: 7, label: 'Κινητό', to: '/blog/category/7/mobile', imagePath: '', postCount: 26 }]

    const wrapper = await mountNavbar(at)

    const marked = wrapper.findAll('[data-slot="link"][aria-current="page"]').map(link => link.text())
    expect(marked).toEqual([current()])
  })

  it.each([
    { promotions: true, offered: 'true' },
    { promotions: false, offered: 'false' },
  ])('offers the offers shortcut in the catalogue panel: $offered with promotions $promotions', async ({ promotions, offered }) => {
    setTenantFeatures({ promotions })
    categories.value = [{ id: 1, slug: 'charging', label: 'Φόρτιση', to: '/products/category/1/charging', imagePath: '', imageAlt: '', productCount: 0, children: [] }]

    const wrapper = await mountNavbar()
    const shop = wrapper.findAll('[data-slot="link"]').find(link => link.text() === OPEN_SHOP)!
    // Reka opens a dropdown on a mouse hovering its trigger.
    await shop.trigger('pointermove', { pointerType: 'mouse' })

    await vi.waitFor(() => expect(wrapper.find('chrome-mega-menu-stub').attributes('offersenabled')).toBe(offered))
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
