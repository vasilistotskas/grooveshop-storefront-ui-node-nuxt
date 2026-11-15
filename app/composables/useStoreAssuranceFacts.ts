import type { RouteLocationRaw } from 'vue-router'

/** What the store has said about buying from it, each fact `null` when it has not said it. */
export interface StoreAssuranceFacts {
  /** Business days from dispatch to the door in the country the store ships to first, fastest to slowest. */
  deliveryDays: { min: number, max: number } | null
  /** The `HH:MM` up to which an order leaves the same business day. */
  dispatchCutoff: string | null
  /** The lowest subtotal any carrier ships free from; `null` when none ever does. */
  freeShippingFrom: number | null
  /**
   * What each carrier charges below that: its cheapest rate for the country
   * over all its kinds (home, locker, pickup), cheapest carrier first. A
   * carrier whose cheapest rate is free is left out: it ships free already.
   */
  carrierPrices: Array<{ carrier: string, price: number }>
  /** How the shopper can pay, as one phrase ("Card or cash on delivery"). */
  payment: string | null
  /** The same ways to pay one by one, each capitalised ("Card", "Cash on delivery"). */
  paymentWays: string[]
  /** The carriers the store ships with, by name, cheapest first. */
  carriers: string[]
  /** How many days the shopper has to send it back. */
  returnDays: number | null
  /** The store's return policy, once it has published one. */
  returnPolicy: RouteLocationRaw | undefined
}

/** The wording of each way to pay, in the order a phrase lists them. */
const PAYMENT_LABELS = ['card', 'cash_on_delivery', 'bank_transfer'] as const

type PaymentLabel = (typeof PAYMENT_LABELS)[number]

/** How a pay way's settlement reads to a shopper. BOX NOW's product is sold as cash on delivery. */
const SETTLEMENT_LABEL: Record<SettlementEnum, PaymentLabel> = {
  online: 'card',
  courier_cash: 'cash_on_delivery',
  carrier_terminal: 'cash_on_delivery',
  offline_transfer: 'bank_transfer',
}

/**
 * The ONE reader of the store's buying promises: delivery days, the dispatch
 * cutoff, free shipping and what shipping costs below it, the ways to pay and
 * the return window. The product page's assurances (`useProductAssurances`)
 * and the `store_assurances` band (`useStoreAssurances`) each pick their rows
 * from these facts, so both say the same things from the same data and a
 * design's own templates fetch nothing.
 *
 * Every fact comes from data the store already publishes (the shipping policy,
 * the free-shipping info, the active pay ways, the store settings) and is
 * `null` when that data is missing, so no reader promises what the store has
 * not said. A store without a cart promises no delivery and is asked nothing:
 * the facts are `null` and no request is made.
 */
export async function useStoreAssuranceFacts() {
  const { $i18n } = useNuxtApp()
  const localePath = useLocalePath()
  const cartEnabled = useStoreFeature('cart')

  if (!cartEnabled.value) {
    return computed<StoreAssuranceFacts | null>(() => null)
  }

  const { values } = useStoreSettings()
  const { published } = useFooterContentPages()
  // The band and the product page promise a dispatch for the store, not for
  // one product's stock, so the cutoff is read as stated.
  const dispatchCutoff = useDispatchCutoff(true)

  // Every request starts before any is awaited: a composable keeps its
  // Nuxt context only until its first `await`.
  const [freeShipping, policy, payWays] = await Promise.all([
    useFreeShippingInfo(),
    useShippingPolicy(),
    useStorePayWays(),
  ])

  /** The policy's rates for the country the free-shipping info was read for: the one checkout starts with. */
  const countryRates = computed(() => {
    const country = freeShipping.data.value?.countryCode
    return (policy.data.value ?? []).filter(entry => entry.countryCode === country)
  })

  const deliveryDays = computed(() => {
    const days = countryRates.value
      .flatMap(entry => [entry.deliveryDaysMin, entry.deliveryDaysMax])
      .filter(value => value !== null)
    return days.length ? { min: Math.min(...days), max: Math.max(...days) } : null
  })

  const freeShippingFrom = computed(() => {
    const threshold = freeShipping.data.value?.minThreshold ?? 0
    return threshold > 0 ? threshold : null
  })

  const carrierPrices = computed(() => {
    const cheapest = new Map<string, { carrier: string, price: number }>()
    for (const entry of countryRates.value) {
      const known = cheapest.get(entry.providerCode)
      if (!known || entry.price < known.price) {
        cheapest.set(entry.providerCode, { carrier: entry.providerName, price: entry.price })
      }
    }
    return [...cheapest.values()].filter(({ price }) => price > 0).sort((a, b) => a.price - b.price)
  })

  /** The ways to pay the store takes, in the order a phrase lists them, in the page's words. */
  const paymentParts = computed(() => {
    const labels = new Set(
      (payWays.data.value?.results ?? []).flatMap(payWay =>
        payWay.settlement ? [SETTLEMENT_LABEL[payWay.settlement]] : [],
      ),
    )
    return PAYMENT_LABELS
      .filter(part => labels.has(part))
      .map(part => $i18n.t(`product_assurances.payment_${part}`))
  })

  const capitalised = (text: string) => {
    const locale = $i18n.locale.value
    return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1)
  }

  const payment = computed(() => {
    if (paymentParts.value.length === 0) return null
    return capitalised(new Intl.ListFormat($i18n.locale.value, { type: 'disjunction' }).format(paymentParts.value))
  })

  const carriers = computed(() => {
    const cheapest = new Map<string, { name: string, price: number }>()
    for (const entry of countryRates.value) {
      const known = cheapest.get(entry.providerCode)
      if (!known || entry.price < known.price) cheapest.set(entry.providerCode, { name: entry.providerName, price: entry.price })
    }
    return [...cheapest.values()].sort((a, b) => a.price - b.price).map(({ name }) => name)
  })

  return computed<StoreAssuranceFacts | null>(() => ({
    deliveryDays: deliveryDays.value,
    dispatchCutoff: dispatchCutoff.value,
    freeShippingFrom: freeShippingFrom.value,
    carrierPrices: carrierPrices.value,
    payment: payment.value,
    paymentWays: paymentParts.value.map(capitalised),
    carriers: carriers.value,
    returnDays: returnWindowDays(values.value?.returnWindowDays),
    returnPolicy: published.value.has(LEGAL_ROUTE_SLUGS['return-policy'])
      ? localePath('return-policy')
      : undefined,
  }))
}
