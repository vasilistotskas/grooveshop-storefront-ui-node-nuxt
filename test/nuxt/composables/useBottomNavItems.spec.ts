import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, ref } from 'vue'
import type { EffectScope } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'

/**
 * The phone tab bar's entries. What matters:
 *
 * - Home, Search, Saved (favourite products), Cart and Account, each
 *   behind the switch that gates the page it opens;
 * - exactly one entry is active, decided from the route name — `/` is a
 *   prefix of every path, so a link's own prefix match would light Home
 *   everywhere;
 * - the cart carries its item count, and only while there is one;
 * - signed out, Saved and Account lead to sign-in with a way back.
 */
const { route, loggedIn, flags } = vi.hoisted(() => ({
  route: { name: 'index___el', path: '/', fullPath: '/', query: {} as Record<string, string>, params: {}, hash: '', matched: [], meta: {} },
  loggedIn: { value: false },
  flags: {} as Record<string, boolean>,
}))
mockNuxtImport('useRoute', () => () => route)
mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => flags[key] ?? options.fallback))
// The full surface: the app's auth plugin reads it at boot.
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(loggedIn.value),
  user: ref(null),
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
    for (const key of Object.keys(flags)) Reflect.deleteProperty(flags, key)
    Object.assign(route, { name: 'index___el', path: '/', fullPath: '/', query: {} })
    await useCartStore().cleanCartState()
    useCartStore().cart = makeCart({ totalItems: 0 })
  })

  afterEach(() => {
    scope?.stop()
  })

  it('offers Home, Search, Saved, Cart and Account', () => {
    expect(labels(items())).toEqual([t('home'), t('search.title'), t('saved'), t('cart.title'), t('account')])
  })

  it.each([
    { name: 'Saved when favourites are off', flag: 'FAVOURITES_ENABLED', gone: 'saved' },
    { name: 'the cart when the cart is off', flag: 'CART_ENABLED', gone: 'cart.title' },
  ])('drops $name', ({ flag, gone }) => {
    flags[flag] = false

    expect(labels(items())).not.toContain(t(gone))
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
    Object.assign(route, { name: 'search___el', path: '/search', fullPath: '/search?q=gan#top', query: { q: 'gan' } })

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
