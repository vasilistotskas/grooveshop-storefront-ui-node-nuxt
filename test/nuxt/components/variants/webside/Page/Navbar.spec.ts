import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { NavigationMenuItem } from '@nuxt/ui'
import type { NavLink } from '~~/shared/types/navigation'
import type { CategoryMenuEntry } from '~/composables/useCategoryMenu'
import type { BlogCategoryMenuEntry } from '~/composables/useBlogCategoryMenu'
import Navbar from '~/components/variants/webside/Page/Navbar.vue'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The webside navbar's gift-card link follows the gated-routes
 * table (`shared/utils/gatedRoutes.ts`): gift cards are bought from the
 * catalogue, so a store with the catalogue off links to a 404 otherwise.
 * Its markup is pinned by `design-render.spec.ts`.
 */
const { state } = vi.hoisted(() => ({ state: { header: null as NavLink[] | null } }))
mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => state.header),
  footerColumns: computed(() => null),
  mobileLinks: computed(() => null),
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
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

// The search field is a lazy component, so its module is replaced: the
// stub says whether the header drew it.
vi.mock('~/components/variants/webside/Search/Input.vue', () => ({ default: { template: '<div data-test="search" />' } }))

const linkTargets = async () => {
  const wrapper = await mountSuspended(Navbar, { route: false })
  const hrefs = wrapper.findAll('nav a').map(a => a.attributes('href'))
  wrapper.unmount()
  return hrefs
}

describe('webside Page/Navbar gift-card link', () => {
  beforeEach(() => {
    state.header = null
    categories.value = []
    topics.value = []
    setTenant({ availableLocales: ['el'] })
  })

  it.each([
    { name: 'gift cards and the catalogue are on', features: { giftCards: true, catalogue: true }, linked: true },
    { name: 'the catalogue is off', features: { giftCards: true, catalogue: false }, linked: false },
    { name: 'gift cards are off', features: { giftCards: false, catalogue: true }, linked: false },
  ])('is linked: $linked when $name', async ({ features, linked }) => {
    setTenantFeatures(features)

    expect((await linkTargets()).includes('/gift-cards')).toBe(linked)
  })
})

/**
 * Whether the language switcher is offered follows the TENANT's locales
 * (`Tenant.available_locales`, through `tenantStore.isMultilingual`), not the
 * platform's list: a one-language store loads and draws nothing, and the
 * switcher is back as soon as the store lists a second language, with no code
 * change.
 */
describe('webside Page/Navbar language switcher', () => {
  const switcher = async (availableLocales: string[]) => {
    setTenant({ availableLocales })
    const wrapper = await mountSuspended(Navbar, { route: false })
    // The switcher is a lazy component: give its chunk the time to arrive.
    await new Promise(resolve => setTimeout(resolve, 500))
    const found = wrapper.find('[aria-label$="Αλλαγή γλώσσας"]').exists()
    wrapper.unmount()
    return found
  }

  it('is absent for a store that serves one language', async () => {
    expect(await switcher(['el'])).toBe(false)
  })

  it('is offered once the store lists a second language', async () => {
    expect(await switcher(['el', 'en'])).toBe(true)
  })
})

const CHARGING: CategoryMenuEntry = {
  id: 1,
  slug: 'charging',
  label: 'Φόρτιση',
  to: '/products/category/1/charging',
  imagePath: 'media/uploads/categories/charging.png',
  imageAlt: '',
  productCount: 5,
  children: [],
}
const MOBILE: BlogCategoryMenuEntry = { id: 7, label: 'Κινητό', to: '/blog/category/7/mobile', imagePath: '', postCount: 26 }

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

/** The menu's sections as `[label, to, slot]`: the slot names the dropdown a section opens. */
const menu = (wrapper: VueWrapper) =>
  barEntries(wrapper).map(item => [item.label, item.to ?? item.href, item.slot])

/** The header's own copy, which the global `$i18n` cannot reach. */
const COPY = {
  products: '5 προϊόντα',
  articles: '26 άρθρα',
  allProducts: 'Όλα τα προϊόντα',
  allArticles: 'Όλα τα άρθρα',
}

/**
 * The link to the products listing opens a dropdown of the store's
 * categories, the link to the blog one of its topics, whether the menu is
 * the built-in one or the store's own. A list with nothing in it (switched
 * off, empty, failed to load: the composables answer an empty list for
 * all three) leaves a plain link, never an empty panel.
 */
describe('webside Page/Navbar dropdowns', () => {
  const t = (key: string) => useNuxtApp().$i18n.t(key)

  beforeEach(() => {
    state.header = null
    categories.value = [CHARGING]
    topics.value = [MOBILE]
    setTenant({ availableLocales: ['el'] })
    setTenantFeatures({ blog: true })
  })

  // WCAG 2.1.1: a panel a keyboard cannot reach is content a keyboard
  // cannot use. Each section is its link plus a button that opens its
  // panel; the button is what a keyboard acts on.
  it('lets a keyboard open a section\'s panel, move into it and close it again', async () => {
    const wrapper = await mountSuspended(Navbar, { route: false, attachTo: document.body })
    const link = wrapper.find('a[data-slot="link"][href="/products"]')
    const button = wrapper.findAll<HTMLButtonElement>('button[data-slot="link"]').find(control => control.text() === `Μενού: ${t('shop')}`)!

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
      const wrapper = await mountSuspended(Navbar, { route: false, attachTo: document.body })
      const name = wrapper.get('a[data-slot="link"][href="/products"]')
      const button = wrapper.findAll('button[data-slot="link"]').find(control => control.text() === `Μενού: ${t('shop')}`)!
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

    // The arrow is a real 24px target, and a 44px one where the pointer is
    // coarse (a touch tablet); happy-dom lays nothing out and matches no
    // media query, so the classes are the contract.
    it('makes the arrow a 24px target, and a 44px one for a coarse pointer', async () => {
      const { button } = await hoverable()

      expect(button.classes()).toEqual(expect.arrayContaining(['min-h-6', 'min-w-6', 'justify-center', 'pointer-coarse:min-h-11', 'pointer-coarse:min-w-11', 'pointer-coarse:-mx-4', 'pointer-coarse:-my-2']))
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

  it('opens the categories from Shop and the topics from Blog', async () => {
    const wrapper = await mountSuspended(Navbar, { route: false })

    expect(menu(wrapper)).toEqual([
      [t('shop'), '/products', 'shop'],
      [t('blog'), '/blog', 'blog'],
    ])
  })

  it('leaves Shop and Blog plain links when there is nothing to list', async () => {
    categories.value = []
    topics.value = []

    const wrapper = await mountSuspended(Navbar, { route: false })

    expect(menu(wrapper)).toEqual([
      [t('shop'), '/products', undefined],
      [t('blog'), '/blog', undefined],
    ])
  })

  it('gives the store\'s own links to the listing and the blog the same dropdowns', async () => {
    state.header = [
      { label: 'Αγορές', to: '/products' },
      { label: 'Άρθρα', to: '/blog' },
      { label: 'Σχετικά', to: '/about' },
      { label: 'Εργαστήριο', href: 'https://workshop.example' },
    ]

    const wrapper = await mountSuspended(Navbar, { route: false })

    expect(menu(wrapper)).toEqual([
      ['Αγορές', '/products', 'shop'],
      ['Άρθρα', '/blog', 'blog'],
      ['Σχετικά', '/about', undefined],
      ['Εργαστήριο', 'https://workshop.example', undefined],
    ])
  })

  // An entry that opens a dropdown is drawn as its trigger, which Reka
  // never marks current: on a product or an article no entry said where
  // the visitor was. On the section's own page it is that page; on a page
  // inside the section it is where the visitor is, not the page.
  it.each([
    { at: '/products', current: () => t('shop'), mark: 'page' },
    { at: '/blog/categories', current: () => t('blog'), mark: 'location' },
  ])('marks the dropdown entry of the section the visitor is in, on $at, as the $mark', async ({ at, current, mark }) => {
    const wrapper = await mountSuspended(Navbar, { route: at })

    const marked = wrapper.findAll('[data-slot="link"][aria-current]').map(link => [link.text(), link.attributes('aria-current')])
    expect(marked).toEqual([[current(), mark]])
  })

  it.each([
    { name: 'Shop', label: () => t('shop'), entry: CHARGING.label, href: '/products/category/1/charging', count: COPY.products, all: COPY.allProducts, allHref: '/products' },
    { name: 'Blog', label: () => t('blog'), entry: MOBILE.label, href: '/blog/category/7/mobile', count: COPY.articles, all: COPY.allArticles, allHref: '/blog' },
  ])('draws $name\'s panel: each entry with its count, then a link to everything', async ({ label, entry, href, count, all, allHref }) => {
    const wrapper = await mountSuspended(Navbar, { route: false })
    const trigger = wrapper.findAll('[data-slot="link"]').find(link => link.text() === `Μενού: ${label()}`)!

    // Reka opens a dropdown on a mouse hovering its trigger.
    await trigger.trigger('pointermove', { pointerType: 'mouse' })

    const panel = () => wrapper.find('[data-slot="content"]')
    await vi.waitFor(() => expect(panel().exists()).toBe(true))
    const links = panel().findAll('a').map(link => [link.text(), link.attributes('href')])
    expect(links).toEqual([
      [`${entry}${count}`, href],
      [all, allHref],
    ])
  })
})

/**
 * Every link the header draws leads to a page that is serving: each is
 * gated by the one table the pages' middlewares agree with
 * (`shared/utils/gatedRoutes.ts`). With the catalogue off the listing
 * and search 404, so neither the Shop entry nor the search field is drawn.
 */
describe('webside Page/Navbar links follow the gated pages', () => {
  const t = (key: string) => useNuxtApp().$i18n.t(key)

  beforeEach(() => {
    state.header = null
    categories.value = []
    topics.value = []
    setTenant({ availableLocales: ['el'] })
  })

  it.each([
    { catalogue: true, drawn: true },
    { catalogue: false, drawn: false },
  ])('draws Shop and the search field: $drawn when the catalogue is $catalogue', async ({ catalogue, drawn }) => {
    setTenantFeatures({ catalogue })

    const wrapper = await mountSuspended(Navbar, { route: false })
    await vi.waitFor(() => expect(wrapper.find('[data-test="search"]').exists()).toBe(drawn))

    expect(menu(wrapper).some(([, to]) => to === '/products')).toBe(drawn)
  })

  it.each([
    { features: { blog: true, favourites: true }, drawn: true },
    { features: { blog: true, favourites: false }, drawn: false },
    { features: { blog: false, favourites: true }, drawn: false },
  ])('draws the saved-articles heart: $drawn with $features', async ({ features, drawn }) => {
    setTenantFeatures(features)

    const wrapper = await mountSuspended(Navbar, { route: false })

    expect(wrapper.find(`a[aria-label="${t('favourites')}"]`).exists()).toBe(drawn)
  })

  it('sends a guest to sign in and back to the page they are on', async () => {
    const wrapper = await mountSuspended(Navbar, { route: '/products?sort=-price' })

    expect(wrapper.find(`a[aria-label="${t('login')}"]`).attributes('href'))
      .toBe('/account/login?next=/products?sort=-price')
  })

  // A link to another site opens in a new tab, as the default design's
  // header and both phone menus open it; it used to replace the store.
  it('opens a store\'s link to another site in a new tab, without handing it the store\'s page', async () => {
    state.header = [{ label: 'Εργαστήριο', href: 'https://workshop.example' }]

    const wrapper = await mountSuspended(Navbar, { route: false })
    const link = wrapper.find('a[href="https://workshop.example"]')

    expect([link.attributes('target'), link.attributes('rel')]).toEqual(['_blank', 'noopener noreferrer'])
  })
})
