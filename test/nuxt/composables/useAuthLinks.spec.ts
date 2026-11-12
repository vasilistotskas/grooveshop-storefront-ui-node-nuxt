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
  route: { name: 'search___el', path: '/search', fullPath: '/search', query: {} as Record<string, string>, params: {}, hash: '', matched: [], meta: {} },
}))
mockNuxtImport('useRoute', () => () => route)

let scope: EffectScope | undefined

function links(at: Partial<typeof route>) {
  Object.assign(route, { query: {}, hash: '' }, at)
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

  it('brings the shopper back to the page they left, query and all, without its hash', () => {
    const { signIn, signUp } = links({ name: 'search___el', fullPath: '/search?q=a%20b&sort=-price#results' })

    expect(signIn).toEqual({ name: 'account-login', query: { next: '/search?q=a%20b&sort=-price' } })
    expect(signUp).toEqual({ name: 'account-signup', query: { next: '/search?q=a%20b&sort=-price' } })
  })

  it('brings them back to the page in its own language', () => {
    const { signIn } = links({ name: 'products___en', fullPath: '/en/products' })

    expect(signIn.query).toEqual({ next: '/en/products' })
  })

  // Signing up from `/account/login?next=/cart` still ends on the cart:
  // the sign-up's completion reads `next` from its own route.
  it('carries the destination the shopper came with from one auth page to another', () => {
    const { signIn, signUp } = links({ name: 'account-login___el', fullPath: '/account/login?next=/cart', query: { next: '/cart' } })

    expect([signIn.query, signUp.query]).toEqual([{ next: '/cart' }, { next: '/cart' }])
  })

  it.each([
    { case: 'none', at: { name: 'account-signup___en', fullPath: '/en/account/signup' } },
    { case: 'another site', at: { name: 'account-login___el', fullPath: '/account/login?next=https://evil.example/', query: { next: 'https://evil.example/' } } },
    { case: 'another site, protocol-relative', at: { name: 'account-password-reset___el', fullPath: '/account/password/reset?next=//evil.example', query: { next: '//evil.example' } } },
  ])('carries no `next` from an auth page that came with $case', ({ at }) => {
    const { signIn, signUp } = links(at)

    expect([signIn.query, signUp.query]).toEqual([undefined, undefined])
  })
})
