import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import type { EffectScope } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

/**
 * The chrome's sign-in and sign-up links bring the shopper back to the
 * page they left, query and all, in whichever language it was. From one
 * sign-in or sign-up page to another, the destination the shopper came
 * with travels on, never the auth page itself, and only a path of this
 * store.
 */
const { route } = vi.hoisted(() => ({
  route: { name: 'search___el', path: '/search', fullPath: '/search', query: {} as Record<string, string>, params: {}, hash: '', matched: [], meta: {} as { signInReturn?: 'path-and-query' | 'nowhere' } },
}))
mockNuxtImport('useRoute', () => () => route)

let scope: EffectScope | undefined

function links(at: Partial<typeof route>) {
  Object.assign(route, { query: {}, hash: '', meta: {} }, at)
  scope = effectScope()
  let result!: ReturnType<typeof useAuthLinks>
  scope.run(() => useNuxtApp().runWithContext(() => {
    result = useAuthLinks()
  }))
  return { signIn: result.signIn.value, signUp: result.signUp.value }
}

describe('useAuthLinks', () => {
  afterEach(() => {
    scope?.stop()
  })

  it('brings the shopper back to the page they left, without its hash, its query where the page marks it view state', () => {
    const { signIn, signUp } = links({ name: 'search___el', path: '/search', fullPath: '/search?q=a%20b&sort=-price#results', meta: { signInReturn: 'path-and-query' } })

    expect(signIn).toEqual({ name: 'account-login', query: { next: '/search?q=a%20b&sort=-price' } })
    expect(signUp).toEqual({ name: 'account-signup', query: { next: '/search?q=a%20b&sort=-price' } })
  })

  it('brings them back to the page in its own language', () => {
    const { signIn } = links({ name: 'products___en', path: '/en/products', fullPath: '/en/products' })

    expect(signIn.query).toEqual({ next: '/en/products' })
  })

  // A query can hold a payment session or an order code, and `next` lands
  // in the sign-in page's address: a page that does not mark its query
  // view state keeps it behind.
  it('carries the order page\'s path, never its payment session or order code', () => {
    const at = '/checkout/success/0b7c5c6e-1c1a-4c1f-9d4a-6f0f3c7a2b10'
    const { signIn } = links({ name: 'checkout-success-uuid___el', path: at, fullPath: `${at}?session_id=cs_live_secret&s=1234567890123456&placed=1` })

    expect(signIn.query).toEqual({ next: at })
  })

  // Signing up from `/account/login?next=/cart` still ends on the cart:
  // the sign-up's completion reads `next` from its own route.
  it('carries the destination the shopper came with from one auth page to another', () => {
    const { signIn, signUp } = links({ name: 'account-login___el', fullPath: '/account/login?next=/cart', query: { next: '/cart' } })

    expect([signIn.query, signUp.query]).toEqual([{ next: '/cart' }, { next: '/cart' }])
  })

  it.each([
    { case: 'none', at: { name: 'account-signup___en', fullPath: '/en/account/signup' } },
    { case: 'the sign-in page itself', at: { name: 'account-signup___el', fullPath: '/account/signup?next=/account/login', query: { next: '/account/login' } } },
    { case: 'another auth page, in English', at: { name: 'account-login___el', fullPath: '/account/login?next=/en/account/signup/passkey', query: { next: '/en/account/signup/passkey' } } },
    { case: 'another site, with a backslash', at: { name: 'account-login___el', fullPath: '/account/login?next=/%5Cevil.example', query: { next: '/\\evil.example' } } },
    { case: 'another site', at: { name: 'account-login___el', fullPath: '/account/login?next=https://evil.example/', query: { next: 'https://evil.example/' } } },
    { case: 'another site, protocol-relative', at: { name: 'account-password-reset___el', fullPath: '/account/password/reset?next=//evil.example', query: { next: '//evil.example' } } },
  ])('carries no `next` from an auth page that came with $case', ({ at }) => {
    const { signIn, signUp } = links(at)

    expect([signIn.query, signUp.query]).toEqual([undefined, undefined])
  })
})
