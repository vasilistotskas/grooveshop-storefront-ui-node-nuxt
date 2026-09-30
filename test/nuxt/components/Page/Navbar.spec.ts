import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { NavLink } from '~/composables/useNavigation'
import type { TenantConfig } from '~~/shared/openapi/types.gen'
import PageNavbar from '~/components/Page/Navbar.vue'
import WebsidePageNavbar from '~/components/variants/webside/Page/Navbar.vue'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { state, mockDeleteSession, mockNavigateTo } = vi.hoisted(() => ({
  state: {
    header: null as NavLink[] | null,
    /** Merchant runtime settings; a missing key takes the caller's fallback. */
    flags: {} as Record<string, boolean>,
  },
  mockDeleteSession: vi.fn(() => Promise.resolve()),
  mockNavigateTo: vi.fn(() => Promise.resolve()),
}))

const session = vi.hoisted(() => ({
  loggedIn: undefined as any,
  user: undefined as any,
}))

mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => state.header),
  footerColumns: computed(() => null),
  mobileItems: computed(() => null),
}))

mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => state.flags[key] ?? options.fallback))

mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  session.user ??= ref(null)
  return {
    loggedIn: session.loggedIn,
    user: session.user,
    session: ref({}),
    ready: ref(true),
    fetch: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
})

mockNuxtImport('useAllAuthAuthentication', () => () => ({ deleteSession: mockDeleteSession }))
mockNuxtImport('navigateTo', () => mockNavigateTo)

/**
 * Both navbars render the bell as `Lazy…`, which Nuxt compiles to a direct
 * async import that no stub key matches; left real, the bell loaded after
 * the test and its import hit a torn-down environment. So the modules the
 * imports load are mocked.
 */
vi.mock('~/components/User/NotificationsBell.vue', () => ({ default: { template: '<div />' } }))
vi.mock('~/components/variants/webside/User/NotificationsBell.vue', () => ({ default: { template: '<div />' } }))

describe.each(trees(PageNavbar, WebsidePageNavbar))('$tree PageNavbar', ({ C, own }) => {
  /** The desktop main-nav links, as `[href, aria-current]`. */
  const mainNav = (wrapper: VueWrapper) =>
    wrapper.findAll('nav ul:first-of-type a').map(a => [a.attributes('href'), a.attributes('aria-current')])

  const stubs = {
    [own('CartButton')]: { template: '<button data-test="cart" />' },
    // UserAvatar's tooltip needs UApp's TooltipProvider, which a bare mount lacks.
    UserAvatar: true,
  }

  beforeEach(() => {
    state.header = null
    state.flags = {}
    if (session.loggedIn) session.loggedIn.value = false
    if (session.user) session.user.value = null
    setTenant({ blogEnabled: false, promotionsEnabled: false, giftCardsEnabled: false })
  })

  it('renders operator-configured header items in place of the platform menu', async () => {
    state.header = [
      { label: 'Blog', to: '/blog' },
      { label: 'Σχετικά', to: '/about' },
      { label: 'Επικοινωνία', to: '/contact' },
    ]

    const wrapper = await mountSuspended(C, { route: '/about/team', global: { stubs } })

    // Operator items match by path prefix, so /about/team keeps About current.
    expect(mainNav(wrapper)).toEqual([
      ['/blog', undefined],
      ['/about', 'page'],
      ['/contact', undefined],
    ])
  })

  it('marks the shop link current on a nested product route', async () => {
    const wrapper = await mountSuspended(C, { route: '/products', global: { stubs } })

    expect(mainNav(wrapper)).toEqual([['/products', 'page']])
  })

  /**
   * Blog is a plan flag; offers and gift cards are two-tier — the plan
   * flag AND the merchant's runtime setting — and fail CLOSED, so a
   * missing setting row never advertises a page the route gate 404s.
   */
  it.each<{ name: string, tenant: Partial<TenantConfig>, flags: Record<string, boolean>, links: string[] }>([
    { name: 'every feature on', tenant: { blogEnabled: true, promotionsEnabled: true, giftCardsEnabled: true }, flags: { PROMOTIONS_ENABLED: true, GIFT_CARDS_ENABLED: true }, links: ['/products', '/blog', '/offers', '/gift-cards'] },
    { name: 'settings missing (fail closed)', tenant: { blogEnabled: true, promotionsEnabled: true, giftCardsEnabled: true }, flags: {}, links: ['/products', '/blog'] },
    { name: 'plan flags off, settings on', tenant: {}, flags: { PROMOTIONS_ENABLED: true, GIFT_CARDS_ENABLED: true }, links: ['/products'] },
  ])('gates the platform menu: $name', async ({ tenant, flags, links }) => {
    setTenant({ blogEnabled: false, promotionsEnabled: false, giftCardsEnabled: false, ...tenant })
    state.flags = flags

    const wrapper = await mountSuspended(C, { route: false, global: { stubs } })

    expect(mainNav(wrapper).map(([href]) => href)).toEqual(links)
  })

  it('shows the cart unless the merchant turned the cart off (fails open)', async () => {
    const shown = await mountSuspended(C, { route: false, global: { stubs } })
    expect(shown.find('[data-test="cart"]').exists()).toBe(true)

    state.flags = { CART_ENABLED: false }
    const hidden = await mountSuspended(C, { route: false, global: { stubs } })
    expect(hidden.find('[data-test="cart"]').exists()).toBe(false)
  })

  it('sends a guest to login with the current page as `next`', async () => {
    const wrapper = await mountSuspended(C, { route: '/products', global: { stubs } })

    const login = wrapper.find(`a[aria-label="${useNuxtApp().$i18n.t('login')}"]`)
    expect(login.attributes('href')).toBe('/account/login?next=/products')
  })

  it('logs out from the account menu, leaving a protected page first', async () => {
    session.loggedIn.value = true
    session.user.value = { id: 1, email: 'shopper@example.com' }
    // The component destructures the store actions at setup, so spy first.
    const cleanCartState = vi.spyOn(useCartStore(), 'cleanCartState').mockResolvedValue(undefined as any)
    vi.spyOn(useCartStore(), 'refreshCart').mockResolvedValue(undefined as any)
    const wrapper = await mountSuspended(C, { route: '/account', global: { stubs }, attachTo: document.body })

    await wrapper.find('button[aria-haspopup="menu"]')
      .trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const logout = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .find(item => item.textContent?.includes(useNuxtApp().$i18n.t('logout')))
    expect(logout?.textContent).toContain(useNuxtApp().$i18n.t('logout'))
    logout!.click()
    await flushPromises()

    expect(mockNavigateTo).toHaveBeenCalledWith('/')
    expect(cleanCartState).toHaveBeenCalledOnce()
    expect(mockDeleteSession).toHaveBeenCalledWith({ explicit: true })
  })
})
