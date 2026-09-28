/**
 * Tests for useCheckoutForm — the composable behind the checkout page's
 * data layer (country/region fetch, live shipping-options pricing, the
 * per-step Zod schemas).
 *
 * TESTABILITY NOTES:
 * - $api and useRequestApi are both routed through the same mockFetch so
 *   a single per-URL dispatcher covers every fetch the composable makes
 *   (settings, b2b profile, countries, pay-way, saved addresses, regions,
 *   shipping options).
 * - useCartStore / storeToRefs / useTenantStore / useUserSession are Nuxt
 *   auto-imports, mocked via mockNuxtImport like useCheckoutSubmit.spec.ts.
 * - Real i18n runs in the nuxt test environment (see testing.md) — assert
 *   with expect.any(String) rather than a hardcoded Greek string where the
 *   exact wording isn't the point.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'

const { mockFetch, mockToastAdd } = vi.hoisted(() => ({
  // Default resolves {} so Nuxt's own bootstrap plugins (i18n, auth,
  // cart) don't crash the app-setup chain before each test's own
  // mockImplementation takes over — see testing.md. Typed with the
  // (url, options) shape every test's own mockImplementation uses, so
  // TS doesn't lock the mock to the zero-arg default's signature.
  mockFetch: vi.fn((_url: string, _options?: any) => Promise.resolve({} as any)),
  mockToastAdd: vi.fn(),
}))

mockNuxtImport('$api', () => mockFetch)
// useApi/useLazyApi (bootstrap plugins use these too) still transport
// through Nuxt's own $fetch, so it needs the same mock, with `create`
// because app/plugins/api.ts calls `$fetch.create()` while booting.
mockNuxtImport('$fetch', () => Object.assign(mockFetch, { create: () => mockFetch }))
mockNuxtImport('useRequestApi', () => () => mockFetch)
mockNuxtImport('useToast', () => () => ({ add: mockToastAdd }))
mockNuxtImport('useRequestHeaders', () => () => ({}))
// Nuxt's own bootstrap (nuxt-auth-utils' session plugin) calls
// useUserSession().fetch() during app setup — omitting it here breaks
// the whole plugin chain (including $i18n) rather than just this
// composable's own read of loggedIn/user.
const mockUserSession = {
  loggedIn: ref(false),
  user: ref(null) as any,
  fetch: vi.fn().mockResolvedValue(undefined),
}
mockNuxtImport('useUserSession', () => () => mockUserSession)

const mockCartHolder = { value: { items: [], totalPrice: 0, totalWeightGrams: 0, currency: 'EUR' } as any }
mockNuxtImport('useCartStore', () => () => ({
  cart: mockCartHolder.value,
  // app/plugins/setup.ts destructures these off the real store during
  // Nuxt's own auth-state-change bootstrap watcher — omitting them
  // throws "is not a function" from that unrelated plugin.
  setupCart: vi.fn().mockResolvedValue(undefined),
  cleanCartState: vi.fn().mockResolvedValue(undefined),
}))
mockNuxtImport('storeToRefs', () => (_store: any) => ({
  getCartItems: computed(() => mockCartHolder.value?.items ?? []),
  cart: mockCartHolder,
}))
mockNuxtImport('useTenantStore', () => () => ({
  defaultCurrency: 'EUR',
  b2bEnabled: false,
}))

// GR is always first (default), CY second — mirrors the real API's
// sort_order rule (GR stays the platform default).
const GR = {
  alpha2: 'GR',
  name: 'Ελλάδα',
  phoneCode: 30,
  hasRegions: true,
  postalCodePattern: '\\d{3} ?\\d{2}',
  postalCodeExample: '151 24',
  phoneMetadata: {
    nationalNumberPattern: '5005000\\d{3}|8\\d{9,11}|(?:[269]\\d|70)\\d{8}',
    possibleLengths: [10, 11, 12],
    nationalPrefixForParsing: null,
    exampleMobile: '6912345678',
  },
}
const CY = {
  alpha2: 'CY',
  name: 'Κύπρος',
  phoneCode: 357,
  hasRegions: true,
  postalCodePattern: '\\d{4}',
  postalCodeExample: '1010',
  phoneMetadata: {
    nationalNumberPattern: '(?:[279]\\d|[58]0)\\d{6}',
    possibleLengths: [8],
    nationalPrefixForParsing: null,
    exampleMobile: '96123456',
  },
}
// A regionless fixture — no real country in this seed lacks regions,
// but the schema rule must hold generically.
const REGIONLESS = { alpha2: 'XX', name: 'Xland', phoneCode: 999, hasRegions: false }

function paginated<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

function defaultDispatch(url: string, options: Record<string, any> = {}): any {
  if (url === '/api/settings/public') return { settings: {} }
  if (url === '/api/b2b/profile') return null
  if (url === '/api/countries') return paginated([GR, CY])
  if (url === '/api/pay-way') return paginated([{ id: 1, name: 'COD', providerCode: 'cod', cost: 0 }])
  if (url === '/api/user/addresses') return paginated([])
  if (url === '/api/regions') {
    const country = options?.query?.country
    if (country === 'GR') return paginated([{ alpha: 'ATTIKI', name: 'Αττική' }])
    if (country === 'CY') return paginated([{ alpha: 'NICOSIA', name: 'Λευκωσία' }])
    return paginated([])
  }
  if (url === '/api/shipping/options') {
    return [{
      providerCode: 'boxnow',
      providerName: 'BOX NOW',
      kind: 'pickup_point',
      price: 2.99,
      currency: 'EUR',
      liveMode: true,
      priority: 5,
      countryCode: options?.query?.countryCode ?? 'GR',
      maxWeightGrams: null,
      exceedsMaxWeight: false,
      metadata: {},
      payWays: [],
    }]
  }
  return null
}

beforeEach(() => {
  vi.stubGlobal('log', { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
  // useCheckoutForm's useAsyncData calls use fixed keys
  // (checkout:countries:*, checkout:store-settings, …) — without
  // clearing, a later test's mockFetch override never runs because
  // the first test's cached result wins.
  clearNuxtData()
  mockFetch.mockReset()
  mockToastAdd.mockReset()
  mockCartHolder.value = { items: [], totalPrice: 0, totalWeightGrams: 0, currency: 'EUR' }
  mockUserSession.loggedIn.value = false
  mockUserSession.user.value = null
  mockFetch.mockImplementation((url: string, options: any) =>
    Promise.resolve(defaultDispatch(url, options)))
})

describe('useCheckoutForm', () => {
  it('fetches countries with shippable: true', async () => {
    await useCheckoutForm()

    const countriesCall = mockFetch.mock.calls.find(([url]) => url === '/api/countries')
    expect(countriesCall?.[1]?.query).toMatchObject({ shippable: true })
  })

  describe('live shipping pricing (no local fallback)', () => {
    it('shippingPrice is the matched live option\'s price', async () => {
      const { shippingPrice, formState } = await useCheckoutForm()
      // Initial country defaults to the first listed (GR); home_delivery
      // is the default method, but the fixture only returns a pickup_point
      // BoxNow row — switch to it to get a priced match.
      formState.shippingMethod = 'box_now_locker'
      await nextTick()
      expect(shippingPrice.value).toBe(2.99)
    })

    it('prices home delivery from the first carrier that can carry the cart', async () => {
      const home = (providerCode: string, price: number, exceedsMaxWeight: boolean) => ({
        providerCode,
        providerName: providerCode,
        kind: 'home_delivery',
        price,
        currency: 'EUR',
        liveMode: true,
        priority: 1,
        countryCode: 'GR',
        maxWeightGrams: exceedsMaxWeight ? 2000 : null,
        exceedsMaxWeight,
        metadata: {},
        payWays: [],
      })
      mockFetch.mockImplementation((url: string, options: any) => {
        if (url === '/api/shipping/options') {
          return Promise.resolve([home('acs', 2.99, true), home('flat_rate', 3.5, false)])
        }
        return Promise.resolve(defaultDispatch(url, options))
      })

      const { shippingPrice } = await useCheckoutForm()

      // The server routes the heavy cart to flat_rate, so that is the
      // price the shopper must see.
      expect(shippingPrice.value).toBe(3.5)
    })

    it('keeps the newer country\'s options when an older response lands last', async () => {
      // Every in-flight request, oldest first. Changing the country
      // also fires the composable's own refetch watcher, so which call
      // is newest is read from this list, not assumed.
      const pending: Array<{ country: string, resolve: (value: unknown) => void }> = []
      const option = (countryCode: string, price: number) => ({
        providerCode: 'boxnow',
        providerName: 'BOX NOW',
        kind: 'pickup_point',
        price,
        currency: 'EUR',
        liveMode: true,
        priority: 5,
        countryCode,
        maxWeightGrams: null,
        exceedsMaxWeight: false,
        metadata: {},
        payWays: [],
      })
      const { formState, retryShippingOptions, shippingPrice } = await useCheckoutForm()
      formState.shippingMethod = 'box_now_locker'
      mockFetch.mockImplementation((url: string, options: any) => {
        if (url === '/api/shipping/options') {
          return new Promise((resolve) => {
            pending.push({ country: options.query.countryCode, resolve })
          })
        }
        return Promise.resolve(defaultDispatch(url, options))
      })

      formState.countryId = 'GR'
      void retryShippingOptions()
      formState.countryId = 'CY'
      void retryShippingOptions()
      await nextTick()

      const newest = pending.at(-1)!
      const oldest = pending[0]!
      expect(newest.country).toBe('CY')
      expect(oldest.country).toBe('GR')
      newest.resolve([option('CY', 4.5)])
      await flushPromises()
      oldest.resolve([option('GR', 2.99)])
      await flushPromises()

      expect(shippingPrice.value).toBe(4.5)
    })

    it('refetchShippingOptions reports whether the selected method has a live price', async () => {
      let fail = false
      mockFetch.mockImplementation((url: string, options: any) => {
        if (url === '/api/shipping/options' && fail) return Promise.reject(new Error('network'))
        return Promise.resolve(defaultDispatch(url, options))
      })

      const { formState, refetchShippingOptions } = await useCheckoutForm()
      formState.shippingMethod = 'box_now_locker'
      await nextTick()
      expect(await refetchShippingOptions()).toBe(true)

      fail = true
      expect(await refetchShippingOptions()).toBe(false)
    })

    it('is null (not 0) when the live options fetch fails, and sets shippingOptionsError', async () => {
      mockFetch.mockImplementation((url: string, options: any) => {
        if (url === '/api/shipping/options') return Promise.reject(new Error('network'))
        return Promise.resolve(defaultDispatch(url, options))
      })

      const { shippingPrice, shippingOptionsError } = await useCheckoutForm()

      expect(shippingOptionsError.value).toBe(true)
      expect(shippingPrice.value).toBeNull()
    })

    it('retryShippingOptions clears the error once the fetch succeeds', async () => {
      let fail = true
      mockFetch.mockImplementation((url: string, options: any) => {
        if (url === '/api/shipping/options') {
          if (fail) return Promise.reject(new Error('network'))
          return Promise.resolve(defaultDispatch(url, options))
        }
        return Promise.resolve(defaultDispatch(url, options))
      })

      const { shippingOptionsError, retryShippingOptions } = await useCheckoutForm()
      expect(shippingOptionsError.value).toBe(true)

      fail = false
      await retryShippingOptions()

      expect(shippingOptionsError.value).toBe(false)
    })
  })

  describe('step1Schema — region required only when the country hasRegions', () => {
    it('requires region for GR (has regions)', async () => {
      const { step1Schema } = await useCheckoutForm()
      const result = step1Schema.safeParse(baseAddress({ country: 'GR', region: '' }))
      expect(result.success).toBe(false)
      expect(result.error?.issues.some(i => i.path[0] === 'region')).toBe(true)
    })

    it('does not require region for a country with no regions', async () => {
      mockFetch.mockImplementation((url: string, options: any) => {
        if (url === '/api/countries') return Promise.resolve(paginated([GR, REGIONLESS]))
        return Promise.resolve(defaultDispatch(url, options))
      })
      const { step1Schema } = await useCheckoutForm()
      const result = step1Schema.safeParse(baseAddress({ country: 'XX', region: '' }))
      expect(result.error?.issues.some(i => i.path[0] === 'region') ?? false).toBe(false)
    })

    it('validates phone against the selected country\'s own metadata (CY, 8 digits)', async () => {
      const { step1Schema } = await useCheckoutForm()
      const result = step1Schema.safeParse(baseAddress({ country: 'CY', region: 'NICOSIA', phone: '96123456' }))
      expect(result.error?.issues.some(i => i.path[0] === 'phone')).toBe(false)
    })

    it('rejects a Greek-length phone number against CY\'s 8-digit metadata', async () => {
      const { step1Schema } = await useCheckoutForm()
      const result = step1Schema.safeParse(baseAddress({ country: 'CY', region: 'NICOSIA', phone: '6912345678' }))
      // A bare 10-digit number gets CY's own dial code prepended (no '+'
      // typed), so it's checked as a CY national number and fails length.
      expect(result.error?.issues.some(i => i.path[0] === 'phone')).toBe(true)
    })

    it('accepts a foreign "+" phone regardless of the delivery country (GR shipping to CY)', async () => {
      const { step1Schema } = await useCheckoutForm()
      const result = step1Schema.safeParse(baseAddress({ country: 'CY', region: 'NICOSIA', phone: '+306943413781' }))
      expect(result.error?.issues.some(i => i.path[0] === 'phone')).toBe(false)
    })
  })

  describe('changing the delivery country clears any picked locker', () => {
    it('clears boxnowLockerId/boxnowLocker and acsStation* fields', async () => {
      const { formState } = await useCheckoutForm()
      formState.boxnowLockerId = '4'
      formState.boxnowLocker = { boxnowLockerId: '4' } as any
      formState.acsStationExternalId = 'AAT'
      formState.acsStationBranch = 'BR1'
      formState.acsStation = { externalId: 'AAT' } as any

      formState.country = formState.country === 'GR' ? 'CY' : 'GR'
      await nextTick()
      await flushPromises()

      expect(formState.boxnowLockerId).toBe('')
      expect(formState.boxnowLocker).toBeNull()
      expect(formState.acsStationExternalId).toBe('')
      expect(formState.acsStationBranch).toBe('')
      expect(formState.acsStation).toBeNull()
    })
  })

  describe('saved address in a non-shippable country', () => {
    it('falls back to the new-address form and toasts a warning', async () => {
      mockUserSession.loggedIn.value = true
      mockFetch.mockImplementation((url: string, options: any) => {
        if (url === '/api/user/addresses') {
          return Promise.resolve(paginated([{
            id: 1,
            isMain: true,
            firstName: 'Test',
            lastName: 'User',
            phone: '+306943413781',
            street: 'Main St',
            streetNumber: '1',
            city: 'Athens',
            zipcode: '10001',
            // DE is not in the (shippable) countries list returned below.
            country: 'DE',
            region: '',
          }]))
        }
        if (url === '/api/countries') return Promise.resolve(paginated([GR, CY]))
        return Promise.resolve(defaultDispatch(url, options))
      })

      const { addressEntryMode, formState } = await useCheckoutForm()

      expect(addressEntryMode.value).toBe('new')
      // Reset to the first shippable country rather than left on 'DE'.
      expect(formState.country).toBe('GR')
      expect(mockToastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'warning' }))
    })
  })
})

function baseAddress(overrides: Record<string, unknown> = {}) {
  return {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '6912345678',
    country: 'GR',
    region: 'ATTIKI',
    city: 'Athens',
    zipcode: '10001',
    street: 'Main St',
    streetNumber: '1',
    documentType: 'RECEIPT',
    ...overrides,
  }
}
