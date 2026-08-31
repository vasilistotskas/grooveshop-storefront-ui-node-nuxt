import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { mockFetch, session } = vi.hoisted(() => ({
  // Default implementation keeps the Nuxt bootstrap plugin chain alive
  // (config/session/cart fetches) — see project CLAUDE.md.
  mockFetch: vi.fn<
    (url: string, opts?: Record<string, unknown>) => Promise<unknown>
  >(() => Promise.resolve({})),
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

mockNuxtImport('$fetch', () => mockFetch)
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

function resetB2BState() {
  useState('b2b-prices').value = {}
  useState('b2b-prices-wanted').value = {}
  useState('b2b-prices-fetched').value = {}
  useState('b2b-prices-halted').value = false
}

describe('useB2BPricing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockImplementation(() => Promise.resolve({}))
    setLoggedIn(false)
    resetB2BState()
    useTenantStore().setConfig(null)
  })

  it('does not fetch for logged-out visitors', async () => {
    const { register } = useB2BPricing()
    register([1, 2])
    await new Promise(resolve => setTimeout(resolve, 80))

    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/b2b/prices',
      expect.anything(),
    )
  })

  it('does not fetch when the tenant plan flag is off', async () => {
    setLoggedIn(true)

    const { register } = useB2BPricing()
    register(1)
    await new Promise(resolve => setTimeout(resolve, 80))

    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/b2b/prices',
      expect.anything(),
    )
  })

  it('batch-fetches registered ids once and resolves prices', async () => {
    setLoggedIn(true)
    useTenantStore().setConfig({ b2bEnabled: true } as TenantConfig)
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/b2b/prices') {
        return Promise.resolve([PRICE_ROW])
      }
      return Promise.resolve({})
    })

    const { register, priceFor } = useB2BPricing()
    register(1)
    register([1, 2]) // 1 deduped, 2 appended before the flush

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/b2b/prices', {
        query: { ids: '1,2' },
      })
    })
    await vi.waitFor(() => {
      expect(priceFor(1)?.finalPrice).toBe(111.6)
    })
    expect(priceFor(2)).toBeUndefined() // not in the response — retail
    const priceCalls = mockFetch.mock.calls.filter(
      ([url]) => url === '/api/b2b/prices',
    )
    expect(priceCalls).toHaveLength(1)
  })

  it('buffers registrations while inactive and replays on activation', async () => {
    // The cached-page hard-load case: components register in
    // onMounted BEFORE the async session restore flips loggedIn.
    useTenantStore().setConfig({ b2bEnabled: true } as TenantConfig)
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/b2b/prices') {
        return Promise.resolve([PRICE_ROW])
      }
      return Promise.resolve({})
    })

    const { register, priceFor, active } = useB2BPricing()
    expect(active.value).toBe(false)
    register([1]) // logged out — buffered, no fetch
    await new Promise(resolve => setTimeout(resolve, 80))
    expect(
      mockFetch.mock.calls.filter(([url]) => url === '/api/b2b/prices'),
    ).toHaveLength(0)

    setLoggedIn(true) // session restore lands
    await nextTick()

    await vi.waitFor(() => {
      expect(priceFor(1)?.finalPrice).toBe(111.6)
    })
  })

  it('halts for the session when the endpoint 404s (runtime gate off)', async () => {
    setLoggedIn(true)
    useTenantStore().setConfig({ b2bEnabled: true } as TenantConfig)
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/b2b/prices') {
        return Promise.reject(
          Object.assign(new Error('Not Found'), { statusCode: 404 }),
        )
      }
      return Promise.resolve({})
    })

    const { register, active } = useB2BPricing()
    register(1)
    await vi.waitFor(() => {
      expect(active.value).toBe(false)
    })

    mockFetch.mockClear()
    register(2)
    await new Promise(resolve => setTimeout(resolve, 80))
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/b2b/prices',
      expect.anything(),
    )
  })

  it('does NOT halt on a transient 401 — retries after the auth flip', async () => {
    setLoggedIn(true)
    useTenantStore().setConfig({ b2bEnabled: true } as TenantConfig)
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/b2b/prices') {
        return Promise.reject(
          Object.assign(new Error('Unauthorized'), { statusCode: 401 }),
        )
      }
      return Promise.resolve({})
    })

    const { register, active } = useB2BPricing()
    register(1)
    await new Promise(resolve => setTimeout(resolve, 80))
    expect(active.value).toBe(true) // not halted

    // Session settles; a later registration retries the wanted set.
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/b2b/prices') {
        return Promise.resolve([PRICE_ROW])
      }
      return Promise.resolve({})
    })
    const { register: registerAgain, priceFor } = useB2BPricing()
    registerAgain(2)
    await vi.waitFor(() => {
      expect(priceFor(1)?.finalPrice).toBe(111.6)
    })
  })

  it('resetB2BPricing clears prices so a new identity re-fetches', async () => {
    setLoggedIn(true)
    useTenantStore().setConfig({ b2bEnabled: true } as TenantConfig)
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/b2b/prices') {
        return Promise.resolve([PRICE_ROW])
      }
      return Promise.resolve({})
    })

    const { register, priceFor } = useB2BPricing()
    register(1)
    await vi.waitFor(() => {
      expect(priceFor(1)).toBeDefined()
    })

    resetB2BPricing()
    expect(priceFor(1)).toBeUndefined()

    // The wanted set survives — a new activation re-fetches it.
    const { register: reRegister } = useB2BPricing()
    reRegister(2)
    await vi.waitFor(() => {
      expect(priceFor(1)?.finalPrice).toBe(111.6)
    })
  })
})
