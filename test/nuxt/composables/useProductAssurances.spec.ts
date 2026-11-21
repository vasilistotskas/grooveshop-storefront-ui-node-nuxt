import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, defineComponent, h, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCartStore } from '~/stores/cart'
import { makeCart, makeFreeShippingProgress } from '~~/test/fixtures/cart'
import { makePublicValues } from '~~/test/fixtures/publicValues'
import { setTenant, setTenantFeatures, setTenantPreferences } from '~~/test/helpers/tenant'

/**
 * The purchase assurances under the buy button: three rows, each from data
 * the store already publishes, each hidden when that data is missing, the
 * whole box a store preference. The requests are the ones the footer and the
 * app shell make (`useShippingPolicy`, `useStorePayWays`,
 * `useFreeShippingInfo`), mocked at the composable, and the product's own
 * shipping price (`/api/shipping/product/<id>`), mocked at `useApi`.
 */
const data = vi.hoisted(() => ({
  freeShipping: { minThreshold: 40 as number | null, countryCode: 'GR' as string | null },
  policy: [] as Array<{ countryCode: string, deliveryDaysMin: number | null, deliveryDaysMax: number | null }>,
  payWays: [] as Array<{ settlement?: string }>,
  returnWindow: 14 as number | undefined,
  estimate: null as null | { countryCode: string, price: number, currency: string, free: boolean, freeShippingThreshold: number | null },
  shippingUrl: '',
  published: new Set<string>(),
  requested: 0,
}))

mockNuxtImport('useFreeShippingInfo', () => () => {
  data.requested++
  return Promise.resolve({ data: ref(data.freeShipping) })
})
mockNuxtImport('useShippingPolicy', () => () => {
  data.requested++
  return Promise.resolve({ data: ref(data.policy) })
})
mockNuxtImport('useStorePayWays', () => () => {
  data.requested++
  return Promise.resolve({ data: ref({ results: data.payWays }) })
})
mockNuxtImport('useApi', () => (url: () => string, options: { enabled: MaybeRefOrGetter<boolean> }) => {
  if (toValue(options.enabled) === false) return Promise.resolve({ data: ref(undefined) })
  data.requested++
  data.shippingUrl = url()
  return Promise.resolve({ data: ref({ estimate: data.estimate }) })
})
mockNuxtImport('useStoreSettings', () => () => ({ values: computed(() => data.returnWindow === undefined ? null : makePublicValues({ returnWindowDays: data.returnWindow })) }))
mockNuxtImport('useFooterContentPages', () => () => ({ published: computed(() => data.published), links: computed(() => []) }))

type Assurances = Awaited<ReturnType<typeof useProductAssurances>>

async function load() {
  let result!: Assurances
  const Reader = defineComponent({
    async setup() {
      result = await useProductAssurances(7)
      return () => h('div')
    },
  })
  await mountSuspended(Reader, { route: false })
  return result
}

const text = (assurances: Assurances) => assurances.rows.value.map(row => row.text)

beforeEach(() => {
  setTenant()
  useCartStore().cart = null
  data.freeShipping = { minThreshold: 40, countryCode: 'GR' }
  data.policy = [
    { countryCode: 'GR', deliveryDaysMin: 1, deliveryDaysMax: 3 },
    { countryCode: 'CY', deliveryDaysMin: 5, deliveryDaysMax: 9 },
  ]
  data.payWays = [{ settlement: 'online' }, { settlement: 'courier_cash' }]
  data.returnWindow = 14
  data.estimate = { countryCode: 'GR', price: 1.99, currency: 'EUR', free: false, freeShippingThreshold: 39.9 }
  data.shippingUrl = ''
  data.published = new Set()
  data.requested = 0
})

describe('useProductAssurances', () => {
  it('states delivery, how to pay and the return window', async () => {
    const assurances = await load()

    expect(text(assurances)).toEqual([
      'Παράδοση σε 1–3 εργάσιμες ημέρες από την αποστολή',
      'Κάρτα ή αντικαταβολή',
      'Επιστροφή εντός 14 ημερών',
    ])
  })

  it('reads the delivery days of the country the store ships to first, with what shipping this product costs under them', async () => {
    const assurances = await load()

    const delivery = assurances.rows.value[0]!
    expect(delivery.kind).toBe('delivery')
    expect(delivery.note).toBe('Μεταφορικά από 1,99\u00A0€ · δωρεάν άνω των 39,90\u00A0€')
    expect(assurances.coversFreeShipping.value).toBe(true)
    expect(data.shippingUrl).toBe('/api/shipping/product/7')
  })

  // A product no carrier that takes it ships free above a threshold.
  it('states the price alone when no carrier that takes the product ever ships it free', async () => {
    data.estimate = { countryCode: 'GR', price: 2.99, currency: 'EUR', free: false, freeShippingThreshold: null }

    const assurances = await load()

    expect(assurances.rows.value[0]!.note).toBe('Μεταφορικά από 2,99\u00A0€')
    expect(assurances.coversFreeShipping.value).toBe(true)
  })

  it('says the product ships free when it does on its own', async () => {
    data.estimate = { countryCode: 'GR', price: 0, currency: 'EUR', free: true, freeShippingThreshold: 39.9 }

    const assurances = await load()

    expect(assurances.rows.value[0]!.note).toBe('Δωρεάν μεταφορικά')
    expect(assurances.coversFreeShipping.value).toBe(true)
  })

  it('says nothing of shipping when Django has no price for the product', async () => {
    data.estimate = null

    const assurances = await load()

    expect(assurances.rows.value[0]!.kind).toBe('delivery')
    expect(assurances.rows.value[0]!.note).toBeUndefined()
    expect(assurances.coversFreeShipping.value).toBe(false)
  })

  it('words the note in the page\'s language', async () => {
    setTenant({ availableLocales: ['el', 'en'] })
    const i18n = useNuxtApp().$i18n
    await i18n.setLocale('en')
    try {
      expect((await load()).rows.value[0]!.note).toBe('Shipping from €1.99 · free over €39.90')
    }
    finally {
      await i18n.setLocale('el')
    }
  })

  // The cart's own distance ("add 12 € more") is the more useful line, and
  // the product page's notice draws it, so the row does not state the
  // store-wide threshold beside it.
  it('leaves shipping to the notice of the cart itself once the cart has a route to free shipping', async () => {
    useCartStore().cart = makeCart({ freeShippingProgress: makeFreeShippingProgress() })

    const assurances = await load()

    expect(assurances.rows.value[0]!.note).toBeUndefined()
    expect(assurances.coversFreeShipping.value).toBe(false)
  })

  it('keeps the product\'s shipping for a cart with no route to free shipping', async () => {
    useCartStore().cart = makeCart({ freeShippingProgress: null })

    const assurances = await load()

    expect(assurances.rows.value[0]!.note).toBeDefined()
    expect(assurances.coversFreeShipping.value).toBe(true)
  })

  it('says one number when the shortest and longest delivery are the same', async () => {
    data.policy = [{ countryCode: 'GR', deliveryDaysMin: 2, deliveryDaysMax: 2 }]

    expect(text(await load())[0]).toBe('Παράδοση σε 2 εργάσιμες ημέρες από την αποστολή')
  })

  // Most stores enter no delivery days: the row then states the price alone.
  it('states what shipping costs as the row itself when no delivery days are entered', async () => {
    data.policy = [{ countryCode: 'GR', deliveryDaysMin: null, deliveryDaysMax: null }]

    const assurances = await load()

    const delivery = assurances.rows.value[0]!
    expect(delivery.kind).toBe('delivery')
    expect(delivery.text).toBe('Μεταφορικά από 1,99\u00A0€ · δωρεάν άνω των 39,90\u00A0€')
    expect(delivery.note).toBeUndefined()
    expect(assurances.coversFreeShipping.value).toBe(true)
  })

  it('hides the delivery row, and does not claim the free-shipping line, with neither delivery days nor a price', async () => {
    data.policy = [{ countryCode: 'GR', deliveryDaysMin: null, deliveryDaysMax: null }]
    data.estimate = null

    const assurances = await load()

    expect(assurances.rows.value.map(row => row.kind)).toEqual(['payment', 'returns'])
    expect(assurances.coversFreeShipping.value).toBe(false)
  })

  it('hides the delivery row without delivery days once the cart has a route to free shipping', async () => {
    data.policy = [{ countryCode: 'GR', deliveryDaysMin: null, deliveryDaysMax: null }]
    useCartStore().cart = makeCart({ freeShippingProgress: makeFreeShippingProgress() })

    const assurances = await load()

    expect(assurances.rows.value.map(row => row.kind)).toEqual(['payment', 'returns'])
    expect(assurances.coversFreeShipping.value).toBe(false)
  })

  it('hides the payment row when no pay way is active', async () => {
    data.payWays = []

    expect((await load()).rows.value.map(row => row.kind)).toEqual(['delivery', 'returns'])
  })

  it.each([undefined, 0])('hides the returns row when the window is %j', async (days) => {
    data.returnWindow = days

    expect((await load()).rows.value.map(row => row.kind)).toEqual(['delivery', 'payment'])
  })

  it('says a one-day return window in the singular', async () => {
    data.returnWindow = 1

    expect(text(await load())[2]).toBe('Επιστροφή εντός 1 ημέρας')
  })

  it('links the return window to the return policy once the store has published it', async () => {
    expect((await load()).rows.value[2]!.to).toBeUndefined()

    data.published = new Set(['return-policy'])

    expect((await load()).rows.value[2]!.to).toBe(useLocalePath()('return-policy'))
  })

  it('shows nothing, and asks for nothing, when the store turned the box off', async () => {
    setTenantPreferences({ productAssurances: false })

    const assurances = await load()

    expect(assurances.rows.value).toEqual([])
    expect(data.requested).toBe(0)
  })

  it('shows nothing, and asks for nothing, for a store without a cart', async () => {
    setTenantFeatures({ cart: false })

    const assurances = await load()

    expect(assurances.rows.value).toEqual([])
    expect(data.requested).toBe(0)
  })
})
