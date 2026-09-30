import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { effectScope, nextTick, ref } from 'vue'
import type { EffectScope, Ref } from 'vue'
import b2bPricingPlugin from '~/plugins/b2b-pricing.client'

/**
 * Wholesale prices are per customer. `useState` outlives client-side
 * navigation, so without this plugin a shared device kept showing the
 * previous customer's price tier after they logged out, or showed user
 * A's tier to user B in the same tab. Every identity change — sign-in,
 * sign-out, a different user — drops the fetched prices; the list of
 * products on screen (`b2b-prices-wanted`) is kept, to refetch.
 */
const { session } = vi.hoisted(() => ({
  session: {
    loggedIn: undefined as undefined | Ref<boolean>,
    user: undefined as undefined | Ref<{ id: number } | null>,
  },
}))
mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  session.user ??= ref(null)
  return {
    loggedIn: session.loggedIn,
    user: session.user,
    session: ref({}),
    ready: ref(true),
    fetch: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  }
})

const prices = () => useState<Record<number, unknown>>('b2b-prices')
const wanted = () => useState<Record<number, boolean>>('b2b-prices-wanted')

async function signIn(id: number | null) {
  session.user!.value = id === null ? null : { id }
  session.loggedIn!.value = id !== null
  await nextTick()
}

describe('b2b-pricing plugin', () => {
  // The plugin's watcher lives in its own scope, stopped after each test.
  let scope: EffectScope

  beforeEach(() => {
    session.loggedIn = ref(true)
    session.user = ref({ id: 1 })
    scope = effectScope()
    scope.run(() => (b2bPricingPlugin as unknown as () => void)())
    prices().value = { 10: { productId: 10, price: 8.5 } }
    wanted().value = { 10: true }
  })

  afterEach(() => {
    scope.stop()
  })

  it.each([
    ['signs out', null],
    ['is replaced by another user', 2],
  ])('drops the fetched prices when the customer %s', async (_case, next) => {
    await signIn(next)

    expect(prices().value).toEqual({})
    expect(wanted().value).toEqual({ 10: true })
  })

  it('keeps the prices while the same customer stays signed in', async () => {
    session.user!.value = { id: 1 }
    await nextTick()

    expect(prices().value).toEqual({ 10: { productId: 10, price: 8.5 } })
  })

  it('drops a guest\'s state when a customer signs in', async () => {
    await signIn(null)
    prices().value = { 10: { productId: 10, price: 10 } }

    await signIn(1)

    expect(prices().value).toEqual({})
  })
})
