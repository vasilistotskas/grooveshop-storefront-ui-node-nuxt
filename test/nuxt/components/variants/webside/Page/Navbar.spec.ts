import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
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

/** The menu's items as `[label, to, slot]`: the slot names the dropdown an entry opens. */
const menu = (wrapper: VueWrapper) =>
  (wrapper.findComponent({ name: 'UNavigationMenu' }).props('items') as NavigationMenuItem[])
    .map(item => [item.label, item.to ?? item.href, item.slot])

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
  // the visitor was.
  it.each([
    { at: '/products', current: () => t('shop') },
    { at: '/blog/categories', current: () => t('blog') },
  ])('marks the dropdown entry of the section the visitor is in, on $at', async ({ at, current }) => {
    const wrapper = await mountSuspended(Navbar, { route: at })

    const marked = wrapper.findAll('[data-slot="link"][aria-current="page"]').map(link => link.text())
    expect(marked).toEqual([current()])
  })

  it.each([
    { name: 'Shop', label: () => t('shop'), entry: CHARGING.label, href: '/products/category/1/charging', count: COPY.products, all: COPY.allProducts, allHref: '/products' },
    { name: 'Blog', label: () => t('blog'), entry: MOBILE.label, href: '/blog/category/7/mobile', count: COPY.articles, all: COPY.allArticles, allHref: '/blog' },
  ])('draws $name\'s panel: each entry with its count, then a link to everything', async ({ label, entry, href, count, all, allHref }) => {
    const wrapper = await mountSuspended(Navbar, { route: false })
    const trigger = wrapper.findAll('[data-slot="link"]').find(link => link.text() === label())!

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
