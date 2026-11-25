import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { makePublicValues } from '~~/test/fixtures/publicValues'
import { makeRegion, makeShippingPolicyRow } from '~~/test/fixtures/shippingPolicy'
import { setTenant, setTenantFeatures, setTenantPreferences } from '~~/test/helpers/tenant'

/**
 * The store's shopping promises as the `store_assurances` band states them:
 * four rows from the facts the product page's assurances read
 * (`useStoreAssuranceFacts`), each left out when its fact is missing. The
 * requests are mocked at the composables that make them, as in
 * `useProductAssurances.spec.ts`.
 */
const data = vi.hoisted(() => ({
  freeShipping: { minThreshold: 39.9 as number | null, countryCode: 'GR' as string | null },
  policy: [] as ShippingPolicyRow[],
  payWays: [] as Array<{ settlement?: string }>,
  returnWindow: 14 as number | undefined,
  dispatchCutoff: '15:00',
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
mockNuxtImport('useStoreSettings', () => () => ({
  values: computed(() => data.returnWindow === undefined
    ? null
    : makePublicValues({ returnWindowDays: data.returnWindow, dispatchCutoff: data.dispatchCutoff })),
}))
mockNuxtImport('useFooterContentPages', () => () => ({ published: computed(() => data.published), links: computed(() => []) }))

type Assurances = Awaited<ReturnType<typeof useStoreAssurances>>

async function load() {
  let result!: Assurances
  const Reader = defineComponent({
    async setup() {
      result = await useStoreAssurances()
      return () => h('div')
    },
  })
  await mountSuspended(Reader, { route: false })
  return result
}

const rate = (providerCode: string, providerName: string, price: number, days: [number | null, number | null] = [1, 3], countryCode = 'GR', regions: Region[] = []) =>
  makeShippingPolicyRow({
    countryCode,
    providerCode,
    providerName,
    price,
    deliveryDaysMin: days[0],
    deliveryDaysMax: days[1],
    regionCodes: regions.map(region => region.alpha),
    regions,
  })

const attica = makeRegion()
const crete = makeRegion({ alpha: 'GR-M', sortOrder: 2, translations: { el: { name: 'Κρήτη' }, en: { name: 'Crete' } } })
/** Region names as the page's language joins them. */
const joined = (...names: string[]) => new Intl.ListFormat(useNuxtApp().$i18n.locale.value, { type: 'conjunction' }).format(names)

const row = (assurances: Assurances, kind: string) => assurances.rows.value.find(found => found.kind === kind)

beforeEach(() => {
  setTenant()
  data.freeShipping = { minThreshold: 39.9, countryCode: 'GR' }
  data.policy = [
    rate('boxnow', 'BOX NOW', 1.99, [1, 2]),
    rate('boxnow', 'BOX NOW', 2.5, [1, 2]),
    rate('acs', 'ACS Courier', 2.99, [1, 3]),
    rate('acs', 'ACS Courier', 9, [5, 9], 'CY'),
  ]
  data.payWays = [{ settlement: 'online' }, { settlement: 'courier_cash' }]
  data.returnWindow = 14
  data.dispatchCutoff = '15:00'
  data.published = new Set()
  data.requested = 0
})

describe('useStoreAssurances', () => {
  it('states delivery, free shipping, returns and the ways to pay, in that order', async () => {
    const { $i18n } = useNuxtApp()

    const assurances = await load()

    expect(assurances.rows.value.map(found => [found.kind, found.title])).toEqual([
      ['delivery', $i18n.t('store_assurances.delivery_range', { min: 1, max: 3 })],
      ['freeShipping', $i18n.t('store_assurances.free_shipping_from', { amount: $i18n.n(39.9, 'currency') })],
      ['returns', $i18n.t('store_assurances.returns', { count: 14 }, 14)],
      ['payment', expect.any(String)],
    ])
    // The ways to pay are the product page's one phrase (`useStoreAssuranceFacts`,
    // worded, joined and capitalised as `useProductAssurances.spec.ts` pins it):
    // here card, then cash on delivery, the store's two settlements.
    const [card, cash] = ['card', 'cash_on_delivery'].map(way => $i18n.t(`product_assurances.payment_${way}`).toLocaleLowerCase('el'))
    const payment = row(assurances, 'payment')!.title.toLocaleLowerCase('el')
    expect(payment.startsWith(card!)).toBe(true)
    expect(payment.endsWith(cash!)).toBe(true)
    // The range as the product page writes it (`useProductAssurances.spec.ts`): an en dash, not a hyphen.
    expect(assurances.rows.value[0]!.title).toContain('1–3')
  })

  it('puts the dispatch cutoff under delivery, and nothing when the store set none', async () => {
    const { $i18n } = useNuxtApp()

    expect(row(await load(), 'delivery')!.note).toBe($i18n.t('store_assurances.dispatch_cutoff', { time: '15:00' }))

    data.dispatchCutoff = ''

    expect(row(await load(), 'delivery')!.note).toBeUndefined()
  })

  it('says one number when the shortest and longest delivery are the same', async () => {
    data.policy = [rate('acs', 'ACS Courier', 2.99, [2, 2])]

    expect(row(await load(), 'delivery')!.title).toBe(useNuxtApp().$i18n.t('store_assurances.delivery_days', { count: 2 }, 2))
  })

  it('lists what each carrier charges below free shipping, its cheapest rate, cheapest carrier first', async () => {
    const { $i18n } = useNuxtApp()
    data.policy = [rate('acs', 'ACS Courier', 2.99), rate('boxnow', 'BOX NOW', 2.5), rate('boxnow', 'BOX NOW', 1.99), rate('pickup', 'Παραλαβή', 0)]

    expect(row(await load(), 'freeShipping')!.note).toBe([
      $i18n.t('store_assurances.carrier_price', { carrier: 'BOX NOW', price: $i18n.n(1.99, 'currency') }),
      $i18n.t('store_assurances.carrier_price', { carrier: 'ACS Courier', price: $i18n.n(2.99, 'currency') }),
    ].join(' · '))
  })

  // A store that delivers home only to some regions (Django's region zones):
  // a price that holds there alone says where, one that covers the country
  // stays as it was.
  it('names the regions a carrier\'s only rates apply to, and prices a carrier with a country-wide rate on it', async () => {
    const { $i18n } = useNuxtApp()
    data.policy = [
      rate('acs', 'ACS Courier', 3.5, [1, 2], 'GR', [attica, crete]),
      rate('acs', 'ACS Courier', 5, [2, 4], 'GR', [makeRegion({ alpha: 'GR-A', sortOrder: 3 })]),
      rate('boxnow', 'BOX NOW', 2.5),
      rate('boxnow', 'BOX NOW', 1.99, [1, 1], 'GR', [attica]),
    ]

    expect(row(await load(), 'freeShipping')!.note).toBe([
      $i18n.t('store_assurances.carrier_price', { carrier: 'BOX NOW', price: $i18n.n(2.5, 'currency') }),
      $i18n.t('store_assurances.carrier_price_in', { carrier: 'ACS Courier', price: $i18n.n(3.5, 'currency'), regions: joined('Αττική', 'Κρήτη') }),
    ].join(' · '))
  })

  it('promises delivery days on the country-wide rates, and a regional promise names its regions', async () => {
    const { $i18n } = useNuxtApp()
    data.policy = [rate('boxnow', 'BOX NOW', 2.5, [2, 4]), rate('acs', 'ACS Courier', 3.5, [1, 1], 'GR', [attica])]

    expect(row(await load(), 'delivery')!.title).toBe($i18n.t('store_assurances.delivery_range', { min: 2, max: 4 }))

    data.policy = [rate('acs', 'ACS Courier', 3.5, [1, 2], 'GR', [attica]), rate('acs', 'ACS Courier', 6, [2, 3], 'GR', [crete])]

    expect(row(await load(), 'delivery')!.title)
      .toBe($i18n.t('store_assurances.delivery_range_in', { min: 1, max: 3, regions: joined('Αττική', 'Κρήτη') }))
  })

  it('names a region by its code when its record is missing', async () => {
    const { $i18n } = useNuxtApp()
    data.policy = [makeShippingPolicyRow({ price: 3.5, deliveryDaysMin: 2, deliveryDaysMax: 2, regionCodes: ['GR-X'], regions: [] })]

    expect(row(await load(), 'delivery')!.title).toBe($i18n.t('store_assurances.delivery_days_in', { count: 2, regions: 'GR-X' }, 2))
  })

  // A carrier with a free kind (pickup) ships free already: it is no price
  // "below free shipping", whatever its other kinds cost.
  it('leaves out a carrier whose cheapest rate is free, though another of its rates is not', async () => {
    const { $i18n } = useNuxtApp()
    data.policy = [rate('acs', 'ACS Courier', 3.5), rate('acs', 'ACS Courier', 0), rate('boxnow', 'BOX NOW', 1.99)]

    expect(row(await load(), 'freeShipping')!.note).toBe($i18n.t('store_assurances.carrier_price', { carrier: 'BOX NOW', price: $i18n.n(1.99, 'currency') }))
  })

  it('links the returns row to the return policy once the store has published it', async () => {
    expect(row(await load(), 'returns')!.to).toBeUndefined()

    data.published = new Set(['return-policy'])

    expect(row(await load(), 'returns')!.to).toBe(useLocalePath()('return-policy'))
  })

  it.each([
    ['delivery', 'no delivery days are entered', () => { data.policy = [rate('acs', 'ACS Courier', 2.99, [null, null])] }],
    ['freeShipping', 'no carrier ships free', () => { data.freeShipping = { minThreshold: null, countryCode: 'GR' } }],
    ['returns', 'there is no return window', () => { data.returnWindow = 0 }],
    ['payment', 'no pay way is active', () => { data.payWays = [] }],
  ])('leaves out %s when %s', async (kind, _, arrange) => {
    arrange()

    const kinds = (await load()).rows.value.map(found => found.kind)

    expect(kinds).not.toContain(kind)
    expect(kinds).toHaveLength(3)
  })

  it('has no rows when the store has said none of it', async () => {
    data.policy = []
    data.freeShipping = { minThreshold: null, countryCode: null }
    data.returnWindow = undefined
    data.payWays = []

    expect((await load()).rows.value).toEqual([])
  })

  it('asks for nothing in a store without a cart', async () => {
    setTenantFeatures({ cart: false })

    const assurances = await load()

    expect(assurances.rows.value).toEqual([])
    expect(data.requested).toBe(0)
  })

  // The band is on the page because the merchant put it there: the product
  // page's preference does not switch it off.
  it('states the promises when the store turned the product page\'s box off', async () => {
    setTenantPreferences({ productAssurances: false })

    expect((await load()).rows.value).toHaveLength(4)
  })
})
