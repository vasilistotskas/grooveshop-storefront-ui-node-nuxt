import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import type { EffectScope } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { makeUserDetails } from '~~/test/fixtures/user'
import type { BottomNavTab } from '~/composables/useBottomNavItems'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The phone tab bar's entries, for every design. What matters:
 *
 * - Home, Search, Saved (favourite products), Cart and Account by default,
 *   or the tabs a design asks for (webside: Home, Shop, Blog, Cart,
 *   Account), each behind the switch that gates the page it opens;
 * - exactly one entry is active, decided from the route name — `/` is a
 *   prefix of every path, so a link's own prefix match would light Home
 *   everywhere;
 * - the cart carries its item count, and only while there is one;
 * - signed out, Saved and Account lead to sign-in with a way back.
 */
const { route, loggedIn, user } = vi.hoisted(() => ({
  route: { name: 'index___el', path: '/', fullPath: '/', query: {} as Record<string, string>, params: {}, hash: '', matched: [], meta: {} },
  loggedIn: { value: false },
  user: { value: null as UserDetails | null },
}))
mockNuxtImport('useRoute', () => () => route)
mockNuxtImport('useMediaStreamImage', () => () => (path: string) => `https://media.test/${path}`)
// The full surface: the app's auth plugin reads it at boot.
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(loggedIn.value),
  user: ref(user.value),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

let scope: EffectScope | undefined

function items(options?: Parameters<typeof useBottomNavItems>[0]): NavigationMenuItem[] {
  scope = effectScope()
  let result!: ReturnType<typeof useBottomNavItems>
  scope.run(() => useNuxtApp().runWithContext(() => {
    result = useBottomNavItems(options)
  }))
  return result.items.value
}

const t = (key: string) => useNuxtApp().$i18n.t(key)
const labels = (list: NavigationMenuItem[]) => list.map(item => item.label)
const active = (list: NavigationMenuItem[]) => list.filter(item => item.active).map(item => item.label)
const nextOf = (to: unknown) => new URL(String(to), 'https://shop.test').searchParams.get('next')

describe('useBottomNavItems', () => {
  beforeEach(async () => {
    loggedIn.value = false
    user.value = null
    setTenant({ availableLocales: ['el', 'en'] })
    setTenantFeatures({ favourites: true })
    Object.assign(route, { name: 'index___el', path: '/', fullPath: '/', query: {} })
    await useCartStore().cleanCartState()
    useCartStore().cart = makeCart({ totalItems: 0 })
  })

  afterEach(async () => {
    scope?.stop()
    await useNuxtApp().$i18n.setLocale('el')
  })

  it('offers Home, Search, Saved, Cart and Account', () => {
    expect(labels(items())).toEqual([t('home'), t('search.title'), t('saved'), t('cart.title'), t('account')])
  })

  it('drops Saved for a store without the favourites feature', () => {
    setTenantFeatures({ favourites: false })

    expect(labels(items())).not.toContain(t('saved'))
  })

  it('drops the cart when the cart feature is off', () => {
    setTenantFeatures({ cart: false })

    expect(labels(items())).not.toContain(t('cart.title'))
  })

  // Search lists the catalogue: its page 404s without it.
  it('drops Search for a store without the catalogue', () => {
    setTenantFeatures({ catalogue: false })

    expect(labels(items())).not.toContain(t('search.title'))
  })

  it('drops the cart where the layout asks it to', () => {
    expect(labels(items({ includeCart: false }))).not.toContain(t('cart.title'))
  })

  it.each([
    { route: { name: 'index___el', path: '/', fullPath: '/' }, tab: 'home' },
    { route: { name: 'search___el', path: '/search', fullPath: '/search' }, tab: 'search.title' },
    { route: { name: 'cart___el', path: '/cart', fullPath: '/cart' }, tab: 'cart.title' },
  ])('lights only $tab on $route.path', ({ route: at, tab }) => {
    Object.assign(route, at)

    expect(active(items())).toEqual([t(tab)])
  })

  // `page` on the page the tab leads to, `location` on a page under it.
  it.each([
    { at: { name: 'products___el', path: '/products', fullPath: '/products?sort=-createdAt' }, mark: 'page' },
    { at: { name: 'products-id-slug___el', path: '/products/7/cable', fullPath: '/products/7/cable' }, mark: 'location' },
  ])('marks Shop as the $mark on $at.path', ({ at, mark }) => {
    Object.assign(route, at)

    const marked = items({ tabs: ['home', 'shop', 'cart'] }).filter(item => item['aria-current']).map(item => [item.label, item['aria-current']])

    expect(marked).toEqual([[t('shop'), mark]])
  })

  it('lights Saved, not Account, on the favourites page', () => {
    loggedIn.value = true
    Object.assign(route, { name: 'account-favourites-products___el', path: '/account/favourites/products', fullPath: '/account/favourites/products' })

    expect(active(items())).toEqual([t('saved')])
  })

  it('lights Account on the other account pages', () => {
    loggedIn.value = true
    Object.assign(route, { name: 'account-orders___el', path: '/account/orders', fullPath: '/account/orders' })

    expect(active(items())).toEqual([t('account')])
  })

  it('counts the cart only while it holds something', () => {
    const empty = items().find(item => item.label === t('cart.title'))!
    expect(empty.chip).toBeUndefined()

    useCartStore().cart = makeCart({ totalItems: 3 })
    const filled = items().find(item => item.label === t('cart.title'))!
    expect(filled.chip).toMatchObject({ text: 3, color: 'secondary' })
  })

  it('sends a signed-out shopper to sign in, and back to the page they left', () => {
    // The search page marks its query view state (`signInReturn`).
    Object.assign(route, { name: 'search___el', path: '/search', fullPath: '/search?q=gan#top', query: { q: 'gan' }, meta: { signInReturn: 'path-and-query' } })

    const list = items()
    const saved = list.find(item => item.label === t('saved'))!
    const account = list.find(item => item.label === t('account'))!

    expect(nextOf(saved.to)).toBe('/search?q=gan')
    expect(nextOf(account.to)).toBe('/search?q=gan')
  })

  it('opens the favourites and the account for a signed-in shopper', () => {
    loggedIn.value = true

    const list = items()

    expect(list.find(item => item.label === t('saved'))!.to).toBe('/account/favourites/products')
    expect(list.find(item => item.label === t('account'))!.to).toBe('/account')
  })

  // The sign-in page is no destination; the one it came with travels on.
  it('carries the sign-in page\'s own `next` on, never the sign-in page', () => {
    Object.assign(route, { name: 'account-login___el', path: '/account/login', fullPath: '/account/login?next=/cart', query: { next: '/cart' } })

    const account = items().find(item => item.label === t('account'))!

    expect(String(account.to)).toBe('/account/login?next=/cart')
  })

  it('links in the page\'s language', async () => {
    await useNuxtApp().$i18n.setLocale('en')

    const links = items().map(item => String(item.to))

    expect(links[0]).toBe('/en')
    expect(links.every(link => link.startsWith('/en'))).toBe(true)
  })

  describe('a design\'s own tabs', () => {
    const WEBSIDE: BottomNavTab[] = ['home', 'shop', 'blog', 'cart', 'account']

    beforeEach(() => {
      setTenantFeatures({ catalogue: true, blog: true, cart: true })
    })

    it('offers the tabs it asks for, in its order', () => {
      expect(labels(items({ tabs: WEBSIDE }))).toEqual([t('home'), t('shop'), t('blog'), t('cart.title'), t('account')])
    })

    it.each([
      { feature: 'catalogue', tab: 'shop' },
      { feature: 'blog', tab: 'blog' },
      { feature: 'cart', tab: 'cart.title' },
    ])('drops $tab when the store has the $feature off', ({ feature, tab }) => {
      setTenantFeatures({ catalogue: true, blog: true, cart: true, [feature]: false })

      expect(labels(items({ tabs: WEBSIDE }))).toEqual(
        [t('home'), t('shop'), t('blog'), t('cart.title'), t('account')].filter(label => label !== t(tab)),
      )
    })

    it.each([
      { route: { name: 'products-category-id-slug___el', path: '/products/category/1/x', fullPath: '/products/category/1/x' }, tab: 'shop' },
      { route: { name: 'blog-post-id-slug___el', path: '/blog/post/1/x', fullPath: '/blog/post/1/x' }, tab: 'blog' },
    ])('lights only $tab on $route.path', ({ route: at, tab }) => {
      Object.assign(route, at)

      expect(active(items({ tabs: WEBSIDE }))).toEqual([t(tab)])
    })

    it('links Shop to the products and Blog to the blog', () => {
      const list = items({ tabs: WEBSIDE })

      expect(list.find(item => item.label === t('shop'))!.to).toBe('/products')
      expect(list.find(item => item.label === t('blog'))!.to).toBe('/blog')
    })

    it('takes the design\'s own icon for a tab', () => {
      const cart = items({ tabs: WEBSIDE, icons: { cart: 'i-heroicons-shopping-cart' } })
        .find(item => item.label === t('cart.title'))!

      expect(cart.icon).toBe('i-heroicons-shopping-cart')
    })

    it('shows a signed-in shopper\'s photo on Account when asked to, else the icon', () => {
      loggedIn.value = true
      user.value = makeUserDetails({ mainImagePath: 'media/uploads/users/maria.png' })

      const withPhoto = items({ tabs: WEBSIDE, accountAvatar: true }).find(item => item.label === t('account'))!
      const withoutPhoto = items({ tabs: WEBSIDE }).find(item => item.label === t('account'))!

      expect([withPhoto.avatar?.src, withPhoto.icon]).toEqual(['https://media.test/media/uploads/users/maria.png', undefined])
      expect([withoutPhoto.avatar, withoutPhoto.icon]).toEqual([undefined, 'i-heroicons-user'])
    })
  })

  describe('the Account tab and the account sheet', () => {
    const accountTab = (list: NavigationMenuItem[]) => list.find(item => item.label === t('account'))!

    it('opens the sheet, instead of a page, for a signed-in shopper given one', () => {
      loggedIn.value = true
      const onAccount = vi.fn()

      const tab = accountTab(items({ onAccount }))
      tab.onSelect?.(new Event('click'))

      expect(onAccount).toHaveBeenCalledTimes(1)
      expect(tab.to).toBeUndefined()
    })

    it('still lights Account on the account pages when it opens the sheet', () => {
      loggedIn.value = true
      Object.assign(route, { name: 'account-orders___el', path: '/account/orders', fullPath: '/account/orders' })

      expect(active(items({ onAccount: vi.fn() }))).toEqual([t('account')])
    })

    it('leads a signed-out visitor to sign-in, whatever it was given', () => {
      const onAccount = vi.fn()

      const tab = accountTab(items({ onAccount }))

      expect(String(tab.to)).toContain('/account/login')
      expect(tab.onSelect).toBeUndefined()
    })
  })
})
