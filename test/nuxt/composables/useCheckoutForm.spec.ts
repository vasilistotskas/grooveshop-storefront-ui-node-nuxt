/**
 * Tests for useCheckoutForm — the composable behind the checkout page's
 * data layer (country/region fetch, live shipping-options pricing, pay
 * ways, saved addresses, the B2B invoice prefill, the per-step Zod
 * schemas).
 *
 * TESTABILITY NOTES:
 * - Every fetch the composable makes goes through `$api` /
 *   `useRequestApi` / `useApi` (`$fetch`), all answered by one
 *   `createApiMock` routed per test in `beforeEach`.
 * - The cart and tenant stores are the REAL ones, written directly.
 *   Toggling the mocked session fires app/plugins/setup.ts's loggedIn
 *   watcher (setupCart / cleanCartState), so `/api/cart` answers the
 *   test's own cart and each test settles that watcher before it writes
 *   the store.
 * - The composable runs outside a component, so its watchers are
 *   collected in an effect scope stopped after each test — otherwise
 *   every earlier test's instance would keep reacting to the shared
 *   cart store.
 * - Real i18n runs here; exact copy is asserted through `$i18n`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { effectScope, nextTick, ref } from 'vue'
import type { EffectScope } from 'vue'
import type { CartDetail } from '~~/shared/openapi/types.gen'
import { makeCart } from '~~/test/fixtures/cart'
import { makeCountry } from '~~/test/fixtures/country'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
import { makePayWay } from '~~/test/fixtures/payWay'
import { setTenant } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const { mockToastAdd } = vi.hoisted(() => ({ mockToastAdd: vi.fn() }))

mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)
mockNuxtImport('useToast', () => () => ({ add: mockToastAdd }))
// Nuxt's own bootstrap (nuxt-auth-utils' session plugin) calls
// useUserSession().fetch() during app setup — omitting it breaks the
// whole plugin chain (including $i18n).
const mockUserSession = {
  loggedIn: ref(false),
  user: ref<{ id: number, email: string, firstName?: string, lastName?: string, phone?: string } | null>(null),
  fetch: vi.fn(() => Promise.resolve()),
}
mockNuxtImport('useUserSession', () => () => mockUserSession)

/** A complete ACS Smartpoint row, as the station picker hands it over. */
const ACS_STATION: AcsStation = {
  id: 1,
  uuid: fixtureUuid(6, 1),
  externalId: 'AAT',
  branchCode: 'BR1',
  shopKind: 1,
  name: 'ACS Smartpoint',
  addressLine1: 'Ermou 10',
  city: 'Athens',
  postalCode: '10563',
  countryCode: 'GR',
  lat: null,
  lng: null,
  maxWeightKg: '20',
  workingHours: '',
  isActive: true,
  lastSyncedAt: null,
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
}

// GR first, CY second — the API's sort order (GR is the platform default).
const GR = makeCountry()
const CY = makeCountry({
  translations: { el: { name: 'Κύπρος' }, en: { name: 'Cyprus' } },
  alpha2: 'CY',
  alpha3: 'CYP',
  isoCc: 196,
  phoneCode: 357,
  postalCodePattern: '\\d{4}',
  postalCodeExample: '1010',
  phoneMetadata: {
    nationalNumberPattern: '(?:[279]\\d|[58]0)\\d{6}',
    possibleLengths: [8],
    nationalPrefixForParsing: null,
    exampleMobile: '96123456',
  },
  sortOrder: 2,
})
// A regionless fixture — no real country in this seed lacks regions,
// but the schema rule must hold generically.
const REGIONLESS = makeCountry({
  translations: { el: { name: 'Xland' } },
  alpha2: 'XX',
  alpha3: 'XXL',
  isoCc: null,
  phoneCode: 999,
  phoneMetadata: null,
  hasRegions: false,
  sortOrder: 3,
})

/** A valid ΑΦΜ: the weighted sum of its first 8 digits mod 11 mod 10 is the 9th. */
const VALID_AFM = '123456783'

const COD = makePayWay({ id: 1 })
const CARD = makePayWay({ id: 2, providerCode: 'stripe', settlement: 'online' })

function paginated<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}

function shippingOption(overrides: Record<string, unknown> = {}) {
  return {
    providerCode: 'boxnow',
    providerName: 'BOX NOW',
    kind: 'pickup_point',
    price: 2.99,
    currency: 'EUR',
    liveMode: true,
    priority: 5,
    countryCode: 'GR',
    maxWeightGrams: null,
    exceedsMaxWeight: false,
    metadata: {},
    payWays: [],
    ...overrides,
  }
}

function savedAddress(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    isMain: true,
    firstName: 'Saved',
    lastName: 'Person',
    phone: '+306912345678',
    street: 'Ermou',
    streetNumber: '10',
    city: 'Athens',
    zipcode: '10563',
    country: 'GR',
    region: 'ATTIKI',
    ...overrides,
  }
}

let cart: CartDetail | null = null

/** The routes every test starts from; a test overrides entries by spreading. */
function defaultRoutes() {
  return {
    '/api/cart': () => cart,
    '/api/settings/public': { settings: {} },
    '/api/b2b/profile': null,
    '/api/countries': paginated([GR, CY]),
    '/api/pay-way': paginated([COD]),
    '/api/user/addresses': paginated([]),
    '/api/regions': (_url: string, options: any) => {
      const country = options?.query?.country
      if (country === 'GR') return paginated([{ alpha: 'ATTIKI', name: 'Αττική' }])
      if (country === 'CY') return paginated([{ alpha: 'NICOSIA', name: 'Λευκωσία' }])
      return paginated([])
    },
    '/api/shipping/options': (_url: string, options: any) =>
      [shippingOption({ countryCode: options?.query?.countryCode ?? 'GR' })],
  }
}

let scope: EffectScope | undefined

/** Run the composable in a scope `afterEach` stops, so its watchers die with the test. */
async function setup() {
  scope = effectScope()
  return (await scope.run(() => useCheckoutForm()))!
}

/** Log in (or out) and let the setup plugin's loggedIn watcher finish before the test writes the cart. */
async function setLoggedIn(value: boolean) {
  mockUserSession.loggedIn.value = value
  mockUserSession.user.value = value ? { id: 1, email: 'shopper@example.com' } : null
  await flushPromises()
}

function setCart(next: CartDetail) {
  cart = next
  useCartStore().cart = next
}

beforeEach(async () => {
  // useCheckoutForm's useAsyncData calls use fixed keys
  // (checkout:countries:*, checkout:store-settings, …) and the pay-way
  // selection lives in useState — both outlive a test.
  clearNuxtData()
  clearNuxtState('selectedPayWay')
  cart = makeCart({ items: [] })
  api.routes(defaultRoutes())
  setTenant()
  await setLoggedIn(false)
  setCart(makeCart({ items: [] }))
})

afterEach(() => {
  scope?.stop()
  scope = undefined
})

describe('useCheckoutForm', () => {
  it('fetches countries with shippable: true', async () => {
    await setup()

    const [countries] = api.callsTo('/api/countries').filter(call => call.options?.query?.shippable)
    expect(countries?.options.query).toMatchObject({ shippable: true })
  })

  it('also fetches EVERY dial code, unpaginated, for the phone field', async () => {
    await setup()

    const [phone] = api.callsTo('/api/countries').filter(call => call.options?.query?.pagination === 'false')
    expect(phone?.options.query).toMatchObject({ hasPhoneCode: true, pagination: 'false' })
    // Every country carries all its translations, so the list must not
    // refetch (or answer stale) on a language switch.
    expect(phone?.options.query).not.toHaveProperty('languageCode')
    expect(phone?.options.query).not.toHaveProperty('shippable')
  })

  describe('initial country', () => {
    it('falls back to the FIRST listed country for a guest and loads its regions', async () => {
      api.routes({ ...defaultRoutes(), '/api/countries': paginated([CY, GR]) })

      const { formState, regionOptions } = await setup()

      expect(formState.country).toBe('CY')
      expect(formState.countryId).toBe('CY')
      expect(regionOptions.value.map(o => o.value)).toEqual(['NICOSIA'])
    })

    it('leaves the country empty and fetches no regions when no country is listed', async () => {
      api.routes({ ...defaultRoutes(), '/api/countries': paginated([]) })

      const { formState } = await setup()

      expect(formState.country).toBe('')
      expect(api.callsTo('/api/regions')).toEqual([])
    })
  })

  describe('live shipping pricing (no local fallback)', () => {
    it('shippingPrice is the matched live option\'s price', async () => {
      const { shippingPrice, formState } = await setup()
      formState.shippingMethod = 'box_now_locker'
      await nextTick()
      expect(shippingPrice.value).toBe(2.99)
    })

    it('quotes shipping for the cart\'s own total, weight and currency', async () => {
      setCart(makeCart({ currency: 'USD', items: [{ quantity: 2 }] }))

      await setup()

      const [call] = api.callsTo('/api/shipping/options')
      expect(call?.options.query).toEqual({
        countryCode: 'GR',
        orderValueAmount: cart!.totalPrice,
        currency: 'USD',
        weightGrams: cart!.totalWeightGrams,
      })
    })

    it('prices home delivery from the first carrier that can carry the cart', async () => {
      const home = (providerCode: string, price: number, exceedsMaxWeight: boolean) => shippingOption({
        providerCode,
        providerName: providerCode,
        kind: 'home_delivery',
        price,
        priority: 1,
        maxWeightGrams: exceedsMaxWeight ? 2000 : null,
        exceedsMaxWeight,
      })
      api.routes({
        ...defaultRoutes(),
        '/api/shipping/options': [home('acs', 2.99, true), home('flat_rate', 3.5, false)],
      })

      const { shippingPrice } = await setup()

      // The server routes the heavy cart to flat_rate, so that is the
      // price the shopper must see.
      expect(shippingPrice.value).toBe(3.5)
    })

    it('keeps the newer country\'s options when an older response lands last', async () => {
      // Every in-flight request, oldest first. Changing the country
      // also fires the composable's own refetch watcher, so which call
      // is newest is read from this list, not assumed.
      const pending: Array<{ country: string, resolve: (value: unknown) => void }> = []
      const { formState, retryShippingOptions, shippingPrice } = await setup()
      formState.shippingMethod = 'box_now_locker'
      api.routes({
        ...defaultRoutes(),
        '/api/shipping/options': (_url: string, options: any) => new Promise((resolve) => {
          pending.push({ country: options.query.countryCode, resolve })
        }),
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
      newest.resolve([shippingOption({ countryCode: 'CY', price: 4.5 })])
      await flushPromises()
      oldest.resolve([shippingOption({ countryCode: 'GR', price: 2.99 })])
      await flushPromises()

      expect(shippingPrice.value).toBe(4.5)
    })

    it('refetchShippingOptions reports whether the selected method has a live price', async () => {
      const { formState, refetchShippingOptions } = await setup()
      formState.shippingMethod = 'box_now_locker'
      await nextTick()
      expect(await refetchShippingOptions()).toBe(true)

      api.routes({
        ...defaultRoutes(),
        '/api/shipping/options': () => { throw new Error('network') },
      })
      expect(await refetchShippingOptions()).toBe(false)
    })

    it('is null (not 0) when the live options fetch fails, and sets shippingOptionsError', async () => {
      api.routes({
        ...defaultRoutes(),
        '/api/shipping/options': () => { throw new Error('network') },
      })

      const { shippingPrice, shippingOptionsError } = await setup()

      expect(shippingOptionsError.value).toBe(true)
      expect(shippingPrice.value).toBeNull()
    })

    it('retryShippingOptions clears the error once the fetch succeeds', async () => {
      api.routes({
        ...defaultRoutes(),
        '/api/shipping/options': () => { throw new Error('network') },
      })
      const { shippingOptionsError, retryShippingOptions } = await setup()
      expect(shippingOptionsError.value).toBe(true)

      api.routes(defaultRoutes())
      await retryShippingOptions()

      expect(shippingOptionsError.value).toBe(false)
    })

    describe('shippingOverWeight — a cart no offered method can carry', () => {
      const capped = (overrides: Record<string, unknown>) => shippingOption({ exceedsMaxWeight: true, ...overrides })

      it('names the cart\'s weight and the largest cap when the cart is over every one', async () => {
        setCart(makeCart({ totalWeightGrams: 12500 }))
        api.routes({
          ...defaultRoutes(),
          '/api/shipping/options': [
            capped({ maxWeightGrams: 4000 }),
            capped({ providerCode: 'acs', kind: 'home_delivery', maxWeightGrams: 10000 }),
          ],
        })

        const { shippingOverWeight } = await setup()

        expect(shippingOverWeight.value).toEqual({ cartWeight: '12,5 κιλά', maxWeight: '10 κιλά' })
      })

      it('is null while one method still carries the cart', async () => {
        api.routes({
          ...defaultRoutes(),
          '/api/shipping/options': [
            capped({ maxWeightGrams: 4000 }),
            shippingOption({ providerCode: 'acs', kind: 'home_delivery' }),
          ],
        })

        const { shippingOverWeight } = await setup()

        expect(shippingOverWeight.value).toBeNull()
      })
    })
  })

  describe('shipping method and pay ways', () => {
    const payWayQuery = () => api.callsTo('/api/pay-way').map(call => call.options.query)

    it('moves a locker-only store off home delivery and lists the locker\'s pay ways', async () => {
      // BoxNow rejects cash on delivery at a locker, so Django answers
      // the locker filter without it. Pre-selecting COD from the
      // home-delivery list was the bug this reconcile exists for.
      api.routes({
        ...defaultRoutes(),
        '/api/pay-way': (_url: string, options: any) =>
          paginated(options.query.shippingKind === 'pickup_point' ? [CARD] : [COD, CARD]),
      })

      const { formState, selectedPayWay } = await setup()

      expect(formState.shippingMethod).toBe('box_now_locker')
      expect(payWayQuery().at(-1)).toMatchObject({ shippingProviderCode: 'boxnow', shippingKind: 'pickup_point' })
      expect(formState.payWayId).toBe(CARD.id)
      expect(selectedPayWay.value?.id).toBe(CARD.id)
    })

    it('keeps home delivery and the first pay way when the store offers home delivery', async () => {
      api.routes({
        ...defaultRoutes(),
        '/api/shipping/options': [shippingOption({ providerCode: 'flat_rate', kind: 'home_delivery' })],
        '/api/pay-way': paginated([COD, CARD]),
      })

      const { formState } = await setup()

      expect(formState.shippingMethod).toBe('home_delivery')
      expect(formState.payWayId).toBe(COD.id)
    })

    it.each([
      ['resets a selection the new method no longer offers', [CARD], CARD.id],
      ['keeps a selection the new method still offers', [CARD, COD], COD.id],
    ])('switching the shipping method %s', async (_case, lockerPayWays, expected) => {
      api.routes({
        ...defaultRoutes(),
        '/api/shipping/options': [
          shippingOption({ providerCode: 'flat_rate', kind: 'home_delivery' }),
          shippingOption(),
        ],
        '/api/pay-way': (_url: string, options: any) =>
          paginated(options.query.shippingKind === 'pickup_point' ? lockerPayWays : [COD, CARD]),
      })
      const { formState } = await setup()
      expect(formState.payWayId).toBe(COD.id)

      formState.shippingMethod = 'box_now_locker'
      await flushPromises()

      expect(payWayQuery().at(-1)).toMatchObject({ shippingProviderCode: 'boxnow', shippingKind: 'pickup_point' })
      expect(formState.payWayId).toBe(expected)
      expect(formState.payWay).toBe(expected)
    })

    it('selecting a pay way mirrors it into payWayId and selectedPayWay', async () => {
      api.routes({
        ...defaultRoutes(),
        '/api/shipping/options': [shippingOption({ providerCode: 'flat_rate', kind: 'home_delivery' })],
        '/api/pay-way': paginated([COD, CARD]),
      })
      const { formState, selectedPayWay } = await setup()

      formState.payWay = CARD.id
      await nextTick()

      expect(formState.payWayId).toBe(CARD.id)
      expect(selectedPayWay.value?.id).toBe(CARD.id)
    })
  })

  describe('payWayOptions — the fee shown next to each pay way', () => {
    const FEE = 2.5
    const THRESHOLD = 50
    const withFee = makePayWay({ id: 3, cost: FEE, freeThreshold: THRESHOLD })

    async function optionFor(itemsTotal: number) {
      // One line whose final price is the items total the shopper sees.
      setCart(makeCart({ items: [{ product: { price: itemsTotal, vatPercent: 0 } }] }))
      api.routes({ ...defaultRoutes(), '/api/pay-way': paginated([withFee]) })
      const { payWayOptions, shippingPrice } = await setup()
      return { option: payWayOptions.value[0]!, shippingPrice: shippingPrice.value }
    }

    it('waives the fee once items + shipping reach the threshold, as Django does', async () => {
      // 48,00 € of items + 2,99 € shipping = 50,99 € ≥ 50 €.
      const { option, shippingPrice } = await optionFor(48)

      expect(shippingPrice).toBe(2.99)
      expect(option.label).not.toContain('(+')
      expect(option.freeThresholdHint).toBe('')
    })

    it('shows the surcharge and how to avoid it while below the threshold', async () => {
      const { $i18n } = useNuxtApp()

      const { option } = await optionFor(10)

      expect(option.label).toContain(` (+${$i18n.n(FEE, 'currency')})`)
      expect(option.freeThresholdHint).toBe(
        $i18n.t('pay_way_free_above', { amount: $i18n.n(THRESHOLD, 'currency') }),
      )
    })

    it('carries the name apart from the surcharge, and the surcharge as a number', async () => {
      const { option } = await optionFor(10)

      expect(option.name).toBe('Αντικαταβολή')
      expect(option.cost).toBe(FEE)
    })

    it('carries a cost of 0 once the fee is waived', async () => {
      const { option } = await optionFor(48)

      expect(option.cost).toBe(0)
    })

    it('carries the provider and how it settles, for the payment step to draw', async () => {
      const { option } = await optionFor(10)

      expect(option).toMatchObject({ providerCode: 'cash_on_delivery', settlement: 'courier_cash' })
    })

    /**
     * Django waives the fee on the items AFTER promotions plus the
     * delivery as charged (`order/services.py`): the card must not show
     * a fee the total then leaves out, or the other way round.
     */
    async function optionWithPromotion(promotion: { promotionDiscount?: number, promotionFreeShipping?: boolean }) {
      setCart(makeCart({ items: [{ product: { price: 60, vatPercent: 0 } }], ...promotion }))
      api.routes({ ...defaultRoutes(), '/api/pay-way': paginated([withFee]) })
      const { payWayOptions } = await setup()
      return payWayOptions.value[0]!
    }

    it('charges the fee when a promotion takes the items below the threshold', async () => {
      // 60,00 € − 15,00 € + 2,99 € delivery = 47,99 € < 50 €.
      const option = await optionWithPromotion({ promotionDiscount: 15 })

      expect(option.cost).toBe(FEE)
    })

    it('leaves the delivery out of the base when a promotion makes it free', async () => {
      // 60,00 € − 12,00 € = 48,00 €; the 2,99 € delivery is not charged.
      const option = await optionWithPromotion({ promotionDiscount: 12, promotionFreeShipping: true })

      expect(option.cost).toBe(FEE)
    })
  })

  describe('step1Schema — region required only when the country hasRegions', () => {
    it('requires region for GR (has regions)', async () => {
      const { step1Schema } = await setup()
      const result = step1Schema.safeParse(baseAddress({ country: 'GR', region: '' }))
      expect(result.success).toBe(false)
      expect(result.error?.issues.some(i => i.path[0] === 'region')).toBe(true)
    })

    it('does not require region for a country with no regions', async () => {
      api.routes({ ...defaultRoutes(), '/api/countries': paginated([GR, REGIONLESS]) })
      const { step1Schema } = await setup()
      const result = step1Schema.safeParse(baseAddress({ country: 'XX', region: '' }))
      expect(result.error?.issues.some(i => i.path[0] === 'region') ?? false).toBe(false)
    })

    it('validates phone against the selected country\'s own metadata (CY, 8 digits)', async () => {
      const { step1Schema } = await setup()
      const result = step1Schema.safeParse(baseAddress({ country: 'CY', region: 'NICOSIA', phone: '96123456' }))
      expect(result.error?.issues.some(i => i.path[0] === 'phone')).toBe(false)
    })

    it('rejects a Greek-length phone number against CY\'s 8-digit metadata', async () => {
      const { step1Schema } = await setup()
      const result = step1Schema.safeParse(baseAddress({ country: 'CY', region: 'NICOSIA', phone: '6912345678' }))
      // A bare 10-digit number gets CY's own dial code prepended (no '+'
      // typed), so it's checked as a CY national number and fails length.
      expect(result.error?.issues.some(i => i.path[0] === 'phone')).toBe(true)
    })

    it('accepts a foreign "+" phone regardless of the delivery country (GR shipping to CY)', async () => {
      const { step1Schema } = await setup()
      const result = step1Schema.safeParse(baseAddress({ country: 'CY', region: 'NICOSIA', phone: '+306943413781' }))
      expect(result.error?.issues.some(i => i.path[0] === 'phone')).toBe(false)
    })

    it('validates the phone against the PICKED phone country, not the delivery one', async () => {
      const { step1Schema } = await setup()
      await flushPromises()

      // Delivering to Cyprus with a Greek mobile: GR picked, so +30 is checked against GR.
      const address = { country: 'CY', region: 'NICOSIA', phoneCountry: 'GR' }
      const valid = step1Schema.safeParse(baseAddress({ ...address, phone: '+306912345678' }))
      expect(valid.error?.issues.some(i => i.path[0] === 'phone')).toBe(false)

      const invalid = step1Schema.safeParse(baseAddress({ ...address, phone: '+30123' }))
      const issue = invalid.error?.issues.find(i => i.path[0] === 'phone')
      expect(issue?.message).toContain('6912345678')
      expect(issue?.message).not.toContain('96123456')
    })

    it('falls back to the delivery country while the picker is still following it', async () => {
      const { step1Schema } = await setup()
      await flushPromises()

      const address = { country: 'CY', region: 'NICOSIA', phoneCountry: '' }
      const valid = step1Schema.safeParse(baseAddress({ ...address, phone: '+35796123456' }))
      expect(valid.error?.issues.some(i => i.path[0] === 'phone')).toBe(false)

      const invalid = step1Schema.safeParse(baseAddress({ ...address, phone: '+357123' }))
      const issue = invalid.error?.issues.find(i => i.path[0] === 'phone')
      expect(issue?.message).toContain('96123456')
    })
  })

  describe('step1Schema — save-address title and invoice requisites', () => {
    /** The message of each issue on `field`, or [] when it passes. */
    async function issuesOn(field: string, overrides: Record<string, unknown>) {
      const { step1Schema } = await setup()
      const result = step1Schema.safeParse(baseAddress(overrides))
      return result.error?.issues.filter(i => i.path[0] === field).map(i => i.message) ?? []
    }

    it.each([
      ['a blank title when saving the address', { saveAddress: true, addressTitle: '  ' }, true],
      ['a title when saving the address', { saveAddress: true, addressTitle: 'Home' }, false],
      ['a blank title when not saving', { saveAddress: false, addressTitle: '' }, false],
    ])('addressTitle: %s', async (_case, overrides, fails) => {
      const { $i18n } = useNuxtApp()
      expect(await issuesOn('addressTitle', overrides)).toEqual(fails ? [$i18n.t('validation.required')] : [])
    })

    it.each([
      // [raw ΑΦΜ, expected message key or null]
      [VALID_AFM, null],
      [`EL${VALID_AFM}`, null],
      [`gr ${VALID_AFM}`, null],
      [` ${VALID_AFM} `, null],
      ['12345678', 'validation.billing_vat.invalid'],
      ['12345678A', 'validation.billing_vat.invalid'],
      ['', 'validation.billing_vat.invalid'],
      ['123456784', 'validation.billing_vat.checksum'],
    ])('INVOICE billingVatId %j → %s', async (billingVatId, key) => {
      const { $i18n } = useNuxtApp()
      const issues = await issuesOn('billingVatId', { ...invoice(), billingVatId })
      expect(issues).toEqual(key ? [$i18n.t(key)] : [])
    })

    it.each(['billingCompanyName', 'billingTaxOffice', 'billingActivity'])(
      'INVOICE requires %s',
      async (field) => {
        const { $i18n } = useNuxtApp()
        expect(await issuesOn(field, { ...invoice(), [field]: ' ' })).toEqual([$i18n.t('validation.required')])
      },
    )

    it.each(['billingStreet', 'billingStreetNumber', 'billingCity', 'billingZipcode'])(
      'INVOICE requires %s only when the registered address differs from delivery',
      async (field) => {
        const { $i18n } = useNuxtApp()
        const blank = { ...invoice(), [field]: '' }
        expect(await issuesOn(field, { ...blank, billingSameAsShipping: true })).toEqual([])
        expect(await issuesOn(field, { ...blank, billingSameAsShipping: false })).toEqual([$i18n.t('validation.required')])
      },
    )

    it('a RECEIPT needs none of the invoice requisites', async () => {
      const { step1Schema } = await setup()
      const result = step1Schema.safeParse(baseAddress({ documentType: 'RECEIPT', billingSameAsShipping: false }))
      expect(result.success).toBe(true)
    })

    it('a complete invoice with its own registered address passes', async () => {
      const { step1Schema } = await setup()
      const result = step1Schema.safeParse(baseAddress({ ...invoice(), billingSameAsShipping: false }))
      expect(result.success).toBe(true)
    })
  })

  describe('step2Schema — a locker method needs a picked locker', () => {
    it.each([
      [{ shippingMethod: 'box_now_locker', boxnowLockerId: '' }, 'boxnowLockerId', 'shipping.boxnow.required_error'],
      [{ shippingMethod: 'box_now_locker', boxnowLockerId: '4' }, null, null],
      [{ shippingMethod: 'acs_smartpoint', acsStationExternalId: '' }, 'acsStationExternalId', 'shipping.acs.required_error'],
      [{ shippingMethod: 'acs_smartpoint', acsStationExternalId: 'AAT' }, null, null],
      [{ shippingMethod: 'home_delivery' }, null, null],
    ])('%j', async (input, field, key) => {
      const { $i18n } = useNuxtApp()
      const { step2Schema } = await setup()
      const result = step2Schema.safeParse(input)
      expect(result.error?.issues.map(i => [i.path[0], i.message]) ?? []).toEqual(
        field ? [[field, $i18n.t(key!)]] : [],
      )
    })
  })

  describe('changing the delivery country clears any picked locker', () => {
    it('clears boxnowLockerId/boxnowLocker and acsStation* fields', async () => {
      const { formState } = await setup()
      formState.boxnowLockerId = '4'
      formState.boxnowLocker = { boxnowLockerId: '4', boxnowLockerPostalCode: '10563', boxnowLockerAddressLine1: 'Ermou 10' }
      formState.acsStationExternalId = 'AAT'
      formState.acsStationBranch = 'BR1'
      formState.acsStation = ACS_STATION

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

  describe('pay ways follow the delivery country', () => {
    // A store can exclude a pay way for one country only: BoxNow PAY ON
    // THE GO is offered to Greek lockers, not Cypriot ones. So the list is
    // fetched per (method, country), and a stale answer must not win.
    const PAY_ON_THE_GO = makePayWay({ id: 3, providerCode: 'boxnow_pay_on_the_go', settlement: 'carrier_terminal' })
    const payWayCalls = () => api.callsTo('/api/pay-way')
    const byCountry = (lists: Record<string, PayWay[]>) => (_url: string, options: any) =>
      paginated(lists[options.query.country] ?? [])

    it('asks once, for the settled method and the delivery country', async () => {
      // The only option offered is a BoxNow locker, so the form settles
      // on it before the pay ways are fetched.
      await setup()

      expect(payWayCalls()).toHaveLength(1)
      expect(payWayCalls()[0]!.options.query).toMatchObject({ country: 'GR', shippingProviderCode: 'boxnow', shippingKind: 'pickup_point' })
    })

    it('refetches for the new country and drops a pay way that country excludes', async () => {
      api.routes({ ...defaultRoutes(), '/api/pay-way': byCountry({ GR: [PAY_ON_THE_GO, CARD], CY: [CARD] }) })
      const { formState, payWays } = await setup()
      expect(formState.payWayId).toBe(PAY_ON_THE_GO.id)

      formState.countryId = 'CY'
      await flushPromises()

      expect(payWayCalls().at(-1)!.options.query).toMatchObject({ country: 'CY' })
      expect(payWays.value?.results?.map(payWay => payWay.id)).toEqual([CARD.id])
      expect(formState.payWayId).toBe(CARD.id)
    })

    it('clears the selection when the new country is offered no pay way', async () => {
      // So the step's required rule stops the shopper instead of keeping
      // a pay way the new country does not accept.
      api.routes({ ...defaultRoutes(), '/api/pay-way': byCountry({ GR: [CARD], CY: [] }) })
      const { formState } = await setup()
      expect(formState.payWayId).toBe(CARD.id)

      formState.countryId = 'CY'
      await flushPromises()

      expect(formState.payWay).toBeUndefined()
      expect(formState.payWayId).toBeUndefined()
    })

    it('keeps the list of the latest request when an older one lands last', async () => {
      const { formState, payWays } = await setup()
      const pending: Array<{ country: string, resolve: (value: unknown) => void }> = []
      api.routes({
        ...defaultRoutes(),
        '/api/pay-way': (_url: string, options: any) =>
          new Promise((resolve) => {
            pending.push({ country: options.query.country, resolve })
          }),
      })

      formState.countryId = 'CY'
      await flushPromises()
      formState.countryId = 'GR'
      await flushPromises()

      const oldest = pending[0]!
      const newest = pending.at(-1)!
      expect([oldest.country, newest.country]).toEqual(['CY', 'GR'])
      newest.resolve(paginated([PAY_ON_THE_GO, CARD]))
      await flushPromises()
      oldest.resolve(paginated([CARD]))
      await flushPromises()

      expect(payWays.value?.results?.map(payWay => payWay.id)).toEqual([PAY_ON_THE_GO.id, CARD.id])
    })
  })

  describe('switching country quickly', () => {
    it('keeps the regions of the country selected last when an older response lands last', async () => {
      const { formState, regionOptions } = await setup()
      await flushPromises()
      // Every in-flight regions request, oldest first.
      const pending: Array<{ country: string, resolve: (value: unknown) => void }> = []
      api.routes({
        ...defaultRoutes(),
        '/api/regions': (_url: string, options: any) => new Promise((resolve) => {
          pending.push({ country: options?.query?.country, resolve })
        }),
      })

      // The form starts on GR; go to CY and straight back.
      formState.country = 'CY'
      await nextTick()
      await flushPromises()
      formState.country = 'GR'
      await nextTick()
      await flushPromises()

      const newest = pending.at(-1)!
      const older = pending[0]!
      expect(older.country).toBe('CY')
      expect(newest.country).toBe('GR')
      newest.resolve(paginated([{ alpha: 'GR-14', name: 'Αττική' }]))
      await flushPromises()
      older.resolve(paginated([{ alpha: 'CY-01', name: 'Λευκωσία' }]))
      await flushPromises()

      expect(regionOptions.value.map(o => o.value)).toEqual(['GR-14'])
    })

    it('keeps a prefilled region when the new country\'s regions request fails', async () => {
      const { formState } = await setup()
      await flushPromises()
      api.routes({
        ...defaultRoutes(),
        '/api/regions': () => { throw new Error('down') },
      })

      // A saved address sets country and region together; the loaded
      // list is still Greece's, which must not judge a Cypriot region.
      formState.region = 'CY-01'
      formState.country = 'CY'
      await nextTick()
      await flushPromises()

      expect(formState.region).toBe('CY-01')
    })
  })

  describe('saved addresses', () => {
    const second = savedAddress({
      id: 2,
      isMain: false,
      firstName: 'Other',
      lastName: 'Place',
      phone: '+35796123456',
      street: 'Makariou',
      streetNumber: '5',
      city: 'Nicosia',
      zipcode: '1065',
      country: 'CY',
      region: 'NICOSIA',
    })

    beforeEach(async () => {
      await setLoggedIn(true)
      api.routes({ ...defaultRoutes(), '/api/user/addresses': paginated([savedAddress(), second]) })
    })

    it('prefills the main address in saved mode, with the session email', async () => {
      const { formState, addressEntryMode, selectedSavedAddressId } = await setup()

      expect(addressEntryMode.value).toBe('saved')
      expect(selectedSavedAddressId.value).toBe(1)
      expect(formState).toMatchObject({
        firstName: 'Saved',
        street: 'Ermou',
        country: 'GR',
        region: 'ATTIKI',
        email: 'shopper@example.com',
      })
    })

    it('picking another saved address applies it and stays in saved mode', async () => {
      const { formState, addressEntryMode, selectSavedAddress } = await setup()

      await selectSavedAddress(2)

      expect(addressEntryMode.value).toBe('saved')
      expect(formState).toMatchObject({
        firstName: 'Other',
        phone: '+35796123456',
        street: 'Makariou',
        country: 'CY',
        countryId: 'CY',
        region: 'NICOSIA',
      })
    })

    it('useNewAddress blanks the address, keeps the email and resets to the first country', async () => {
      const { formState, addressEntryMode, selectedSavedAddressId, selectSavedAddress, useNewAddress } = await setup()
      await selectSavedAddress(2)

      await useNewAddress()

      expect(addressEntryMode.value).toBe('new')
      expect(selectedSavedAddressId.value).toBeNull()
      expect(formState).toMatchObject({
        firstName: '',
        lastName: '',
        phone: '',
        street: '',
        streetNumber: '',
        city: '',
        zipcode: '',
        region: '',
        country: 'GR',
        countryId: 'GR',
        email: 'shopper@example.com',
      })
    })

    it('falls back to the new-address form and toasts a warning when its country is not shippable', async () => {
      // DE is not in the (shippable) countries list.
      api.routes({ ...defaultRoutes(), '/api/user/addresses': paginated([savedAddress({ country: 'DE', region: '' })]) })

      const { addressEntryMode, formState } = await setup()

      expect(addressEntryMode.value).toBe('new')
      // Reset to the first shippable country rather than left on 'DE'.
      expect(formState.country).toBe('GR')
      expect(mockToastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'warning' }))
    })
  })

  describe('a signed-in shopper with no saved address', () => {
    it('starts from the account: email, name and phone', async () => {
      await setLoggedIn(true)
      mockUserSession.user.value = { id: 1, email: 'shopper@example.com', firstName: 'Maria', lastName: 'Papadopoulou', phone: '+306912345678' }

      const { formState, addressEntryMode } = await setup()

      expect(addressEntryMode.value).toBe('new')
      expect(formState).toMatchObject({
        email: 'shopper@example.com',
        firstName: 'Maria',
        lastName: 'Papadopoulou',
        phone: '+306912345678',
        phoneCountry: '',
      })
    })

    it('leaves a guest\'s form blank', async () => {
      await setLoggedIn(false)

      const { formState } = await setup()

      expect(formState).toMatchObject({ email: '', firstName: '', lastName: '', phone: '' })
    })
  })

  describe('B2B invoice prefill', () => {
    const profile = {
      status: 'APPROVED',
      companyName: 'Acme ΑΕ',
      vatId: VALID_AFM,
      taxOffice: 'ΔΟΥ Α Αθηνών',
      activity: 'Χονδρεμπόριο',
      billingStreet: 'Stadiou',
      billingStreetNumber: '3',
      billingCity: 'Athens',
      billingZipcode: '10559',
    }

    beforeEach(async () => {
      setTenant({ b2bEnabled: true })
      await setLoggedIn(true)
    })

    it.each([
      ['APPROVED', 'INVOICE'],
      ['PENDING', 'RECEIPT'],
    ])('a %s profile prefills the requisites; the document type is %s', async (status, documentType) => {
      api.routes({ ...defaultRoutes(), '/api/b2b/profile': { ...profile, status } })

      const { formState } = await setup()

      expect(formState).toMatchObject({
        documentType,
        billingVatId: VALID_AFM,
        billingCompanyName: 'Acme ΑΕ',
        billingTaxOffice: 'ΔΟΥ Α Αθηνών',
        billingActivity: 'Χονδρεμπόριο',
        billingSameAsShipping: false,
        billingStreet: 'Stadiou',
        billingCity: 'Athens',
      })
    })

    it('does not prefill when the store switched B2B invoicing off', async () => {
      api.routes({
        ...defaultRoutes(),
        '/api/settings/public': { settings: { B2B_INVOICING_ENABLED: 'False' } },
        '/api/b2b/profile': profile,
      })

      const { formState, b2bInvoicingEnabled } = await setup()

      expect(b2bInvoicingEnabled.value).toBe(false)
      expect(formState).toMatchObject({ documentType: 'RECEIPT', billingVatId: '', billingCompanyName: '' })
    })

    it('never asks for a profile on a plan without B2B', async () => {
      setTenant({ b2bEnabled: false })

      await setup()

      expect(api.callsTo('/api/b2b/profile')).toEqual([])
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

/** A complete INVOICE: valid ΑΦΜ, the requisites trio and a registered address. */
function invoice() {
  return {
    documentType: 'INVOICE',
    billingVatId: VALID_AFM,
    billingCompanyName: 'Acme ΑΕ',
    billingTaxOffice: 'ΔΟΥ Α Αθηνών',
    billingActivity: 'Χονδρεμπόριο',
    billingSameAsShipping: true,
    billingStreet: 'Stadiou',
    billingStreetNumber: '3',
    billingCity: 'Athens',
    billingZipcode: '10559',
  }
}
