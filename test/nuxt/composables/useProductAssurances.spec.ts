import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCartStore } from '~/stores/cart'
import { makeCart, makeFreeShippingProgress } from '~~/test/fixtures/cart'
import { setTenant, setTenantFeatures, setTenantPreferences } from '~~/test/helpers/tenant'

/**
 * The purchase assurances under the buy button: three rows, each from data
 * the store already publishes, each hidden when that data is missing, the
 * whole box a store preference. The requests are the ones the footer and the
 * app shell make (`useShippingPolicy`, `useStorePayWays`,
 * `useFreeShippingInfo`), mocked at the composable.
 */
const data = vi.hoisted(() => ({
  freeShipping: { minThreshold: 40 as number | null, countryCode: 'GR' as string | null },
  policy: [] as Array<{ countryCode: string, deliveryDaysMin: number | null, deliveryDaysMax: number | null }>,
  payWays: [] as Array<{ settlement?: string }>,
  returnWindow: '14',
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
mockNuxtImport('useSettingValue', () => () => computed(() => data.returnWindow))
mockNuxtImport('useFooterContentPages', () => () => ({ published: computed(() => data.published), links: computed(() => []) }))

type Assurances = Awaited<ReturnType<typeof useProductAssurances>>

async function load() {
  let result!: Assurances
  const Reader = defineComponent({
    async setup() {
      result = await useProductAssurances()
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
  data.returnWindow = '14'
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

  it('reads the delivery days of the country the store ships to first, with the free-shipping threshold under them', async () => {
    const assurances = await load()

    const delivery = assurances.rows.value[0]!
    expect(delivery.kind).toBe('delivery')
    expect(delivery.note).toBe(useNuxtApp().$i18n.t('product_assurances.free_shipping_over', { amount: useNuxtApp().$i18n.n(40, 'currency') }))
    expect(assurances.coversFreeShipping.value).toBe(true)
  })

  // The cart's own distance ("add 12 € more") is the more useful line, and
  // the product page's notice draws it, so the row does not state the
  // store-wide threshold beside it.
  it('leaves the store-wide threshold to the notice of the cart itself once the cart has a route to free shipping', async () => {
    useCartStore().cart = makeCart({ freeShippingProgress: makeFreeShippingProgress() })

    const assurances = await load()

    expect(assurances.rows.value[0]!.note).toBeUndefined()
    expect(assurances.coversFreeShipping.value).toBe(false)
  })

  it('keeps the store-wide threshold for a cart with no route to free shipping', async () => {
    useCartStore().cart = makeCart({ freeShippingProgress: null })

    const assurances = await load()

    expect(assurances.rows.value[0]!.note).toBeDefined()
    expect(assurances.coversFreeShipping.value).toBe(true)
  })

  it('says one number when the shortest and longest delivery are the same', async () => {
    data.policy = [{ countryCode: 'GR', deliveryDaysMin: 2, deliveryDaysMax: 2 }]

    expect(text(await load())[0]).toBe('Παράδοση σε 2 εργάσιμες ημέρες από την αποστολή')
  })

  it('hides the delivery row, and does not claim the free-shipping line, when no delivery days are entered', async () => {
    data.policy = [{ countryCode: 'GR', deliveryDaysMin: null, deliveryDaysMax: null }]

    const assurances = await load()

    expect(assurances.rows.value.map(row => row.kind)).toEqual(['payment', 'returns'])
    expect(assurances.coversFreeShipping.value).toBe(false)
  })

  it('leaves the threshold out when the store has none', async () => {
    data.freeShipping = { minThreshold: null, countryCode: 'GR' }

    const assurances = await load()

    expect(assurances.rows.value[0]!.note).toBeUndefined()
    expect(assurances.coversFreeShipping.value).toBe(false)
  })

  it.each([
    [['online'], 'Κάρτα'],
    [['courier_cash'], 'Αντικαταβολή'],
    [['carrier_terminal', 'courier_cash'], 'Αντικαταβολή'],
    [['offline_transfer', 'online', 'courier_cash'], 'Κάρτα, αντικαταβολή ή τραπεζική κατάθεση'],
  ])('words the pay ways %j as one phrase', async (settlements, phrase) => {
    data.payWays = settlements.map(settlement => ({ settlement }))

    const assurances = await load()

    expect(assurances.rows.value.find(row => row.kind === 'payment')!.text).toBe(phrase)
  })

  it('hides the payment row when no pay way is active', async () => {
    data.payWays = []

    expect((await load()).rows.value.map(row => row.kind)).toEqual(['delivery', 'returns'])
  })

  it.each(['', '0', 'abc', '1.5'])('hides the returns row when the window is %j', async (raw) => {
    data.returnWindow = raw

    expect((await load()).rows.value.map(row => row.kind)).toEqual(['delivery', 'payment'])
  })

  it('says a one-day return window in the singular', async () => {
    data.returnWindow = '1'

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
