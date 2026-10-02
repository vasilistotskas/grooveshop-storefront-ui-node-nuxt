import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { NavigationMenuItem } from '@nuxt/ui'
import type { CategoryMenuEntry } from '~/composables/useCategoryMenu'
import ChromeMobileMenu from '~/components/Chrome/MobileMenu.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The phone menu: the shopper's way into their account, the catalogue
 * as a tree, and the header's other links. The slideover teleports to
 * `body`, so its content is read from the document.
 */
const { navigate, session } = vi.hoisted(() => ({
  navigate: vi.fn(),
  session: { loggedIn: undefined as any },
}))

mockNuxtImport('navigateTo', () => navigate)
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
const categories = ref<CategoryMenuEntry[]>([])
mockNuxtImport('useCategoryMenu', () => () => ({
  categories,
  hasCategories: computed(() => categories.value.length > 0),
}))

const stubs = {
  ChromeMobileMenuAccount: { template: '<div data-test="account" />' },
  TenantLogo: true,
  LanguageSwitcher: true,
}

/** The menu's own copy (el), which the global `$i18n` cannot reach. */
const COPY = { allInCharging: 'Όλα σε Φόρτιση' }

const CHARGING: CategoryMenuEntry = {
  id: 1,
  slug: 'charging',
  label: 'Φόρτιση',
  to: '/products/category/1/charging',
  imagePath: '',
  children: [{ id: 2, slug: 'cables', label: 'Καλώδια', to: '/products/category/2/cables', imagePath: '', children: [] }],
}

/** The header's items as the navbar hands them over: Shop carries the catalogue. */
const ITEMS: NavigationMenuItem[] = [
  { label: 'Κατάστημα', to: '/products', children: [{ label: 'Φόρτιση', to: CHARGING.to }] },
  { label: 'Προσφορές', to: '/offers' },
  { label: 'Blog', to: '/blog' },
]

const body = () => new DOMWrapper(document.body)
const treeRow = (label: string) => body().findAll('[role="treeitem"]').find(row => row.text() === label)

async function openMenu(items: NavigationMenuItem[] = ITEMS) {
  const wrapper = await mountSuspended(ChromeMobileMenu, { route: false, props: { open: true, items }, global: { stubs } })
  await flushPromises()
  return wrapper
}

describe('Chrome/MobileMenu', () => {
  beforeEach(() => {
    categories.value = [CHARGING]
    if (session.loggedIn) session.loggedIn.value = false
    setTenant({ availableLocales: ['el'] })
  })

  it('sends a guest to sign in, and shows a member their account', async () => {
    await openMenu()
    expect(body().find('a[href="/account/login"]').exists()).toBe(true)
    expect(body().find('[data-test="account"]').exists()).toBe(false)
  })

  it('shows a member their account instead of the sign-in link', async () => {
    session.loggedIn.value = true

    await openMenu()

    expect(body().find('[data-test="account"]').exists()).toBe(true)
    expect(body().find('a[href="/account/login"]').exists()).toBe(false)
  })

  it('opens a branch on its own category first, then its children', async () => {
    await openMenu()

    await treeRow('Φόρτιση')!.trigger('click')

    expect(body().findAll('[role="treeitem"]').map(row => row.text()))
      .toEqual(['Φόρτιση', COPY.allInCharging, 'Καλώδια'])
  })

  it('goes to a picked category and closes', async () => {
    const wrapper = await openMenu()
    await treeRow('Φόρτιση')!.trigger('click')

    await treeRow('Καλώδια')!.trigger('click')
    await flushPromises()

    expect(navigate).toHaveBeenCalledWith('/products/category/2/cables')
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('lists the header\'s other links, the catalogue entry replaced by the tree', async () => {
    await openMenu()

    const links = body().findAll('nav a').map(link => link.attributes('href'))
    expect(links).toEqual(['/offers', '/blog'])
  })

  it('draws no catalogue for a store without categories', async () => {
    categories.value = []

    await openMenu()

    expect(body().find('[role="tree"]').exists()).toBe(false)
  })
})
