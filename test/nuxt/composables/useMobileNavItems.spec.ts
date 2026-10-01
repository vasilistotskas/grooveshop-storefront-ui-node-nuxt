import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import type { EffectScope } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

/**
 * The phone's bottom bar. Its links are in the page's language, and the
 * signed-out "account" link brings the shopper back to the very page
 * they left — query and all — the way the auth middleware does.
 */
const { route, loggedIn } = vi.hoisted(() => ({
  route: { name: 'search___el', path: '/search', fullPath: '/search', query: {} as Record<string, string>, params: {}, hash: '', matched: [], meta: {} },
  loggedIn: { value: false },
}))
mockNuxtImport('useRoute', () => () => route)
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

function items() {
  scope = effectScope()
  let result!: ReturnType<typeof useMobileNavItems>
  scope.run(() => useNuxtApp().runWithContext(() => {
    result = useMobileNavItems()
  }))
  return result.items.value
}

/** The `next` the signed-out account link carries. */
const nextOf = (to: unknown) => new URL(String(to), 'https://shop.test').searchParams.get('next')

describe('useMobileNavItems', () => {
  beforeEach(() => {
    loggedIn.value = false
    Object.assign(route, { name: 'search___el', path: '/search', fullPath: '/search', query: {} })
  })

  afterEach(async () => {
    scope?.stop()
    await useNuxtApp().$i18n.setLocale('el')
  })

  it('brings a signed-out shopper back to the page they left, query and all', () => {
    Object.assign(route, { fullPath: '/search?q=a%20b&sort=-price', query: { q: 'a b', sort: '-price' } })

    const account = items().at(-1)!

    expect(nextOf(account.to)).toBe('/search?q=a%20b&sort=-price')
  })

  it('carries no `next` from the sign-in page itself', () => {
    Object.assign(route, { name: 'account-login___el', path: '/account/login', fullPath: '/account/login?next=/cart', query: { next: '/cart' } })

    const account = items().at(-1)!

    expect(String(account.to)).toBe('/account/login')
  })

  it('links in the page\'s language', async () => {
    await useNuxtApp().$i18n.setLocale('en')

    const links = items().map(item => String(item.to))

    expect(links[0]).toBe('/en')
    expect(links).toContain('/en/search')
    expect(links.every(link => link.startsWith('/en'))).toBe(true)
  })
})
