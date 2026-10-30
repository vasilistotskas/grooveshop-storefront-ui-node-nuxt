import type { RouteLocationRaw } from 'vue-router'

export interface ProductAssuranceRow {
  kind: 'delivery' | 'payment' | 'returns'
  icon: string
  text: string
  /** The line under the text, when the row has one. */
  note?: string
  to?: RouteLocationRaw
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
 * The purchase assurances under the product page's buy button: how long
 * delivery takes, what free shipping starts at, how the shopper can pay and
 * for how long they can return it.
 *
 * ONE reader for every design: both product pages draw the rows this
 * returns, and a design's own templates fetch nothing. Every row comes from
 * data the store already publishes and hides when that data is missing
 * (no delivery days entered, no active pay way, no return window), so a
 * store never promises what it has not said. The whole box is the store's
 * `productAssurances` preference, and needs the cart: a browse-only store
 * promises no delivery.
 *
 * `coversFreeShipping` is whether a row states the free-shipping threshold,
 * so the product page does not state it a second time in its notice. A
 * shopper whose cart already has a free-shipping route is shown the cart's
 * own distance by that notice instead ("add 12 € more"), so the row then
 * leaves the store-wide threshold out: one statement, the more useful one.
 */
export async function useProductAssurances() {
  const { $i18n } = useNuxtApp()
  const localePath = useLocalePath()
  const preferred = useStorePreference('productAssurances')
  const cartEnabled = useStoreFeature('cart')
  const label = computed(() => $i18n.t('product_assurances.label'))

  // A store that turned the box off, or has no cart, asks for nothing.
  if (!preferred.value || !cartEnabled.value) {
    return { rows: computed<ProductAssuranceRow[]>(() => []), label, coversFreeShipping: computed(() => false) }
  }

  const { cart } = storeToRefs(useCartStore())
  const cartHasProgress = computed(() => Boolean(cart.value?.freeShippingProgress))

  const returnWindowSetting = useSettingValue('RETURN_WINDOW_DAYS')
  const { published } = useFooterContentPages()

  // Every request starts before any is awaited: a composable keeps its
  // Nuxt context only until its first `await`.
  const [freeShipping, policy, payWays] = await Promise.all([
    useFreeShippingInfo(),
    useShippingPolicy(),
    useStorePayWays(),
  ])

  const delivery = computed<ProductAssuranceRow | null>(() => {
    const country = freeShipping.data.value?.countryCode
    const days = (policy.data.value ?? [])
      .filter(entry => entry.countryCode === country)
      .flatMap(entry => [entry.deliveryDaysMin, entry.deliveryDaysMax])
      .filter(value => value !== null)
    if (days.length === 0) return null

    const min = Math.min(...days)
    const max = Math.max(...days)
    const threshold = freeShipping.data.value?.minThreshold ?? 0
    return {
      kind: 'delivery',
      icon: 'i-lucide-truck',
      text: min === max
        ? $i18n.t('product_assurances.delivery_days', { count: min }, min)
        : $i18n.t('product_assurances.delivery_range', { min, max }),
      note: threshold > 0 && !cartHasProgress.value
        ? $i18n.t('product_assurances.free_shipping_over', { amount: $i18n.n(threshold, 'currency') })
        : undefined,
    }
  })

  const payment = computed<ProductAssuranceRow | null>(() => {
    const labels = new Set(
      (payWays.data.value?.results ?? []).flatMap(payWay =>
        payWay.settlement ? [SETTLEMENT_LABEL[payWay.settlement]] : [],
      ),
    )
    if (labels.size === 0) return null

    const locale = $i18n.locale.value
    const phrase = new Intl.ListFormat(locale, { type: 'disjunction' }).format(
      PAYMENT_LABELS
        .filter(part => labels.has(part))
        .map(part => $i18n.t(`product_assurances.payment_${part}`)),
    )
    return {
      kind: 'payment',
      icon: 'i-lucide-credit-card',
      text: phrase.charAt(0).toLocaleUpperCase(locale) + phrase.slice(1),
    }
  })

  const returns = computed<ProductAssuranceRow | null>(() => {
    const days = returnWindowDays(returnWindowSetting.value)
    if (days === null) return null
    return {
      kind: 'returns',
      icon: 'i-lucide-undo-2',
      text: $i18n.t('product_assurances.returns', { count: days }, days),
      to: published.value.has(LEGAL_ROUTE_SLUGS['return-policy'])
        ? localePath('return-policy')
        : undefined,
    }
  })

  const rows = computed<ProductAssuranceRow[]>(() =>
    [delivery.value, payment.value, returns.value].filter(row => row !== null),
  )

  return {
    rows,
    label,
    coversFreeShipping: computed(() => rows.value.some(row => row.kind === 'delivery' && row.note !== undefined)),
  }
}
