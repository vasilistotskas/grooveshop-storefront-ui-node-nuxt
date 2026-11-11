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
