import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { effectScope, nextTick } from 'vue'
import type { EffectScope } from 'vue'
import { setTenant } from '~~/test/helpers/tenant'
import { failWith } from '~~/test/helpers/api'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())

const { session } = vi.hoisted(() => ({
  // Holder for a REACTIVE session flag — created inside the mock
  // factory (Vue isn't importable in vi.hoisted). A plain object here
  // would cache `active` as a dep-less computed and the composable's
  // activation watcher (the late-session-restore path under test)
  // would never fire.
  session: { state: null as { loggedIn: boolean } | null },
}))

function setLoggedIn(value: boolean) {
  if (session.state) {
    session.state.loggedIn = value
  }
}

mockNuxtImport('$api', () => api)
mockNuxtImport('useUserSession', () => {
  session.state ??= reactive({ loggedIn: false })
  const state = session.state
  return () => ({
    loggedIn: computed(() => state.loggedIn),
    user: computed(() => (state.loggedIn ? { id: 1 } : null)),
    fetch: vi.fn().mockResolvedValue(undefined),
  })
})

// Wire-contract fixture: zB2bPrice declares NUMBERS (DRF renders
// Decimals as JSON numbers here) — a string fixture would encode a
// shape parseDataAs would 422 on.
const PRICE_ROW = {
  productId: 1,
  netPrice: 90,
  finalPrice: 111.6,
  discountPercent: 10,
}

/** The composable's own batching delay (`FLUSH_DELAY_MS`). */
const FLUSH_DELAY_MS = 50

const priceRequests = () => api.callsTo('/api/b2b/prices')

/**
 * The composable registers an `active` watcher; outside a component
 * nothing would ever stop it, so every call runs in a scope that
 * `afterEach` stops — a watcher from one test must not react to the
 * next test's login.
 */
let scopes: EffectScope[] = []
function b2bPricing() {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useB2BPricing())!
}

describe('useB2BPricing', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    setLoggedIn(false)
    useState('b2b-prices').value = {}
    useState('b2b-prices-wanted').value = {}
    useState('b2b-prices-fetched').value = {}
    useState('b2b-prices-halted').value = false
    setTenant()
    api.routes({ '/api/b2b/prices': [PRICE_ROW] })
  })

  afterEach(async () => {
    // The flush timer is module state: a timer still pending when the
    // fake clock is uninstalled would never fire, and `flushTimer`
    // would block every later test from scheduling.
    await vi.runOnlyPendingTimersAsync()
    vi.useRealTimers()
    scopes.forEach(scope => scope.stop())
    scopes = []
  })

  it('does not fetch for logged-out visitors', async () => {
    setTenant({ b2bEnabled: true })
    b2bPricing().register([1, 2])
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)

    expect(priceRequests()).toEqual([])
  })

  it('does not fetch when the tenant plan flag is off', async () => {
    setLoggedIn(true)
    b2bPricing().register(1)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)

    expect(priceRequests()).toEqual([])
  })

  it('batches every id registered within the delay into one request', async () => {
    setLoggedIn(true)
    setTenant({ b2bEnabled: true })

    const { register, priceFor } = b2bPricing()
    register(1)
    register([1, 2]) // 1 deduped, 2 appended before the flush
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS - 1)
    expect(priceRequests()).toEqual([])

    await vi.advanceTimersByTimeAsync(1)

    expect(priceRequests()).toEqual([
      { url: '/api/b2b/prices', options: { query: { ids: '1,2' } } },
    ])
    expect(priceFor(1)?.finalPrice).toBe(111.6)
    expect(priceFor(2)).toBeUndefined() // not in the response — retail
  })

  it('never re-requests an id it already fetched', async () => {
    setLoggedIn(true)
    setTenant({ b2bEnabled: true })

    const { register } = b2bPricing()
    register(1)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    register([1, 3])
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)

    expect(priceRequests().map(call => call.options.query.ids)).toEqual(['1', '3'])
  })

  it('buffers registrations while inactive and replays on activation', async () => {
    // The cached-page hard-load case: components register in
    // onMounted BEFORE the async session restore flips loggedIn.
    setTenant({ b2bEnabled: true })

    const { register, priceFor, active } = b2bPricing()
    expect(active.value).toBe(false)
    register([1]) // logged out — buffered, no fetch
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    expect(priceRequests()).toEqual([])

    setLoggedIn(true) // session restore lands
    await nextTick()
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)

    expect(priceFor(1)?.finalPrice).toBe(111.6)
  })

  it('hides a fetched price as soon as the visitor logs out', async () => {
    setLoggedIn(true)
    setTenant({ b2bEnabled: true })

    const { register, priceFor } = b2bPricing()
    register(1)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    expect(priceFor(1)?.finalPrice).toBe(111.6)

    setLoggedIn(false)

    expect(priceFor(1)).toBeUndefined()
  })

  it.each([
    [404, 'the runtime gate is off'],
    [403, 'the caller is outside the program'],
  ])('halts for the session on a %i (%s)', async (statusCode) => {
    setLoggedIn(true)
    setTenant({ b2bEnabled: true })
    api.routes({ '/api/b2b/prices': failWith(statusCode) })

    const { register, active } = b2bPricing()
    register(1)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    expect(active.value).toBe(false)

    register(2)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    expect(priceRequests()).toHaveLength(1)
  })

  it.each([
    ['a transient 401', failWith(401)],
    ['a network failure', () => { throw new TypeError('Failed to fetch') }],
  ])('does not halt on %s — the next registration retries the wanted set', async (_label, failure) => {
    setLoggedIn(true)
    setTenant({ b2bEnabled: true })
    api.routes({ '/api/b2b/prices': failure })

    const { register, active, priceFor } = b2bPricing()
    register(1)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    expect(active.value).toBe(true)

    api.routes({ '/api/b2b/prices': [PRICE_ROW] })
    register(2)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)

    expect(priceRequests().at(-1)?.options.query.ids).toBe('1,2')
    expect(priceFor(1)?.finalPrice).toBe(111.6)
  })

  it('resetB2BPricing clears prices but keeps the wanted set for the next identity', async () => {
    setLoggedIn(true)
    setTenant({ b2bEnabled: true })

    const { register, priceFor } = b2bPricing()
    register(1)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    expect(priceFor(1)?.finalPrice).toBe(111.6)

    resetB2BPricing()
    expect(priceFor(1)).toBeUndefined()

    register(2)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)

    expect(priceRequests().at(-1)?.options.query.ids).toBe('1,2')
    expect(priceFor(1)?.finalPrice).toBe(111.6)
  })
})
