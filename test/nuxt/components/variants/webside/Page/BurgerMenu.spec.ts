import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { DOMWrapper } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { NavLink } from '~~/shared/types/navigation'
import type { CategoryMenuEntry } from '~/composables/useCategoryMenu'
import type { BlogCategoryMenuEntry } from '~/composables/useBlogCategoryMenu'
import BurgerMenu from '~/components/variants/webside/Page/BurgerMenu.vue'
import { useUserStore } from '~/stores/user'
import { makeUserDetails } from '~~/test/fixtures/user'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * Webside's phone menu, in sections: the shopper's account, the shop, the
 * blog, the store's own links (`useNavigation().mobileLinks`: the Mobile
 * menu an admin saves under Content > Menus, else the Header menu; that
 * composable's spec) and the appearance. Its markup is pinned by
 * `design-render.spec.ts`.
 */
const state = vi.hoisted(() => ({
  phoneLinks: null as NavLink[] | null,
}))
const session = vi.hoisted(() => ({
  loggedIn: undefined as unknown as Ref<boolean>,
  user: undefined as unknown as Ref<UserDetails | null>,
}))

mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => [{ label: 'Υπηρεσίες', to: '/services' }]),
  footerColumns: computed(() => null),
  mobileLinks: computed(() => state.phoneLinks),
}))
// The page is idle at once, as it is a moment after a real page has loaded.
mockNuxtImport('onNuxtReady', () => (callback: () => void) => callback())
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

// The avatar draws a tooltip, which needs the app's TooltipProvider.
const stubs = { UserAvatar: { template: '<span data-test="avatar" />' } }

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

/** The menu's own copy, which the global `$i18n` cannot reach. */
const COPY = {
  greeting: 'Γεια σου!',
  allProducts: 'Όλα τα προϊόντα',
  allArticles: 'Όλα τα άρθρα',
  appearance: 'Εμφάνιση',
}

const t = (key: string) => useNuxtApp().$i18n.t(key)

/** The open menu: the last dialog on the page, as a slideover's content is teleported there. */
const dialog = () => new DOMWrapper(document.body).findAll('[role="dialog"]').at(-1)!

/** Opens the menu and hands back its dialog, read from the page it teleports to. */
async function openMenu() {
  const wrapper = await mountSuspended(BurgerMenu, { route: false, attachTo: document.body, global: { stubs } })
  await wrapper.find('button[aria-label]').trigger('click')
  await vi.waitFor(() => expect(dialog().exists()).toBe(true))
  return wrapper
}

/** A section's links as `[text, href]`, the section found by its accessible name. */
const section = (name: string) => dialog().findAll(`nav[aria-label="${name}"] a`)
  .map(link => [link.text(), link.attributes('href')])

beforeEach(() => {
  state.phoneLinks = [{ label: 'Για κινητά', to: '/mobile-only' }]
  categories.value = [CHARGING]
  topics.value = [MOBILE]
  if (session.loggedIn) {
    session.loggedIn.value = false
    session.user.value = null
  }
  useUserStore().account = null
  setTenant({ availableLocales: ['el'], storeName: 'Webside' })
  setTenantFeatures({ catalogue: true, blog: true })
})

describe('webside Page/BurgerMenu', () => {
  it('lists the phone links, not the Header menu', async () => {
    const wrapper = await openMenu()

    const hrefs = dialog().findAll('a').map(a => a.attributes('href'))
    wrapper.unmount()

    expect(hrefs).toContain('/mobile-only')
    expect(hrefs).not.toContain('/services')
  })

  it.each([
    { name: 'gift cards and the catalogue are on', features: { giftCards: true, catalogue: true }, linked: true },
    { name: 'the catalogue is off', features: { giftCards: true, catalogue: false }, linked: false },
  ])('links gift cards: $linked when $name', async ({ features, linked }) => {
    // No saved Mobile menu: the menu draws the store's own default links.
    state.phoneLinks = null
    setTenantFeatures(features)
    const wrapper = await openMenu()

    const hrefs = dialog().findAll('a').map(a => a.attributes('href'))
    wrapper.unmount()

    expect(hrefs.includes('/gift-cards')).toBe(linked)
  })

  // Mounting the content in the tap's own task was most of the ~400 ms a
  // tap on the menu cost on a phone-class CPU (webside's INP, 2026-10-19).
  it('mounts its content, hidden, once the page is idle, before it is opened', async () => {
    const wrapper = await mountSuspended(BurgerMenu, { route: false, attachTo: document.body, global: { stubs } })

    await vi.waitFor(() => expect(document.body.querySelector('a[href="/mobile-only"]')).not.toBeNull())
    const element = document.body.querySelector<HTMLElement>('[role="dialog"]')
    const trigger = wrapper.find('button[aria-label]')

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(element?.style.display).toBe('none')

    await trigger.trigger('click')
    await vi.waitFor(() => expect(element?.style.display).toBe(''))
    wrapper.unmount()
  })

  describe('the account card', () => {
    it('greets a signed-out visitor with sign-in and sign-up, and no sign-out', async () => {
      const wrapper = await openMenu()

      const card = dialog().findAll('p').find(p => p.text().startsWith(COPY.greeting))
      const links = dialog().findAll('a').map(link => [link.text(), link.attributes('href')])
      const signOut = dialog().findAll('button').some(button => button.text() === t('logout'))
      wrapper.unmount()

      expect(card).toBeDefined()
      expect(links).toEqual(expect.arrayContaining([
        [t('login'), '/account/login?next=/'],
        [t('register'), '/account/signup?next=/'],
      ]))
      expect(signOut).toBe(false)
    })

    it('shows a member their account and the way to sign out instead', async () => {
      session.loggedIn.value = true
      session.user.value = makeUserDetails({ email: 'maria@example.com' })
      useUserStore().account = makeUserDetails({ firstName: 'Μαρία', email: 'maria@example.com' })

      const wrapper = await openMenu()

      const text = dialog().text()
      const hrefs = dialog().findAll('a').map(link => link.attributes('href'))
      const signOut = dialog().findAll('button').some(button => button.text() === t('logout'))
      wrapper.unmount()

      expect(text).toContain('maria@example.com')
      expect(text).not.toContain(COPY.greeting)
      expect(hrefs).toContain('/account')
      expect(hrefs).not.toContain('/account/login?next=/')
      expect(signOut).toBe(true)
    })
  })

  describe('the shop and the blog', () => {
    it('lists all products, then each category with its count', async () => {
      const wrapper = await openMenu()

      const shop = section(t('shop'))
      wrapper.unmount()

      expect(shop).toEqual([
        [COPY.allProducts, '/products'],
        ['Φόρτιση5 προϊόντα', '/products/category/1/charging'],
      ])
    })

    it('lists all articles, then each topic', async () => {
      const wrapper = await openMenu()

      const blog = section(t('blog'))
      wrapper.unmount()

      expect(blog).toEqual([
        [COPY.allArticles, '/blog'],
        ['Κινητό', '/blog/category/7/mobile'],
      ])
    })

    it.each([
      { feature: 'catalogue', name: () => t('shop') },
      { feature: 'blog', name: () => t('blog') },
    ])('draws no section for the $feature when the store has it off', async ({ feature, name }) => {
      setTenantFeatures({ catalogue: true, blog: true, [feature]: false })

      const wrapper = await openMenu()

      const found = dialog().find(`nav[aria-label="${name()}"]`).exists()
      wrapper.unmount()

      expect(found).toBe(false)
    })
  })

  describe('the store\'s links', () => {
    it('leave out what the shop and blog sections already stand for', async () => {
      state.phoneLinks = [
        { label: 'Κατάστημα', to: '/products' },
        { label: 'Άρθρα', to: '/blog' },
        { label: 'Σχετικά', to: '/about' },
      ]

      const wrapper = await openMenu()

      const links = dialog().findAll('nav[aria-label="Πλοήγηση"] a').map(link => link.attributes('href'))
      wrapper.unmount()

      expect(links).toEqual(['/about'])
    })

    it('keep a link to the blog when the store has no blog section to stand for it', async () => {
      setTenantFeatures({ catalogue: true, blog: false })
      state.phoneLinks = [{ label: 'Άρθρα', to: '/blog' }]

      const wrapper = await openMenu()

      const links = dialog().findAll('nav[aria-label="Πλοήγηση"] a').map(link => link.attributes('href'))
      wrapper.unmount()

      expect(links).toEqual(['/blog'])
    })

    it('are the built-in ones, without the shop and the blog, for a store that set none', async () => {
      state.phoneLinks = null

      const wrapper = await openMenu()

      const links = dialog().findAll('nav[aria-label="Πλοήγηση"] a').map(link => link.attributes('href'))
      wrapper.unmount()

      expect(links).toEqual(['/', '/search'])
    })
  })

  it('offers the appearance: light, dark or the device\'s', async () => {
    const wrapper = await openMenu()

    const select = dialog().find(`[aria-label="${COPY.appearance}"]`)
    wrapper.unmount()

    expect(select.exists()).toBe(true)
  })

  // The size IS the contract here: every control in the menu is at
  // least 44x44px (WCAG 2.5.5). happy-dom lays nothing out, so the
  // classes that give each one its height are what is checked.
  it('makes every control at least 44px tall', async () => {
    session.loggedIn.value = true
    useUserStore().account = makeUserDetails()
    const wrapper = await openMenu()

    const TALL = /(^|\s)(min-h-1[1-5]|size-11)(\s|$)/
    const short = dialog().findAll('a, button')
      .filter(control => !TALL.test(control.attributes('class') ?? ''))
      .map(control => control.element.outerHTML.slice(0, 120))
    wrapper.unmount()

    expect(short).toEqual([])
  })
})
