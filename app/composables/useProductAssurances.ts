import type { RouteLocationRaw } from 'vue-router'

export interface ProductAssuranceRow {
  kind: 'delivery' | 'payment' | 'returns'
  icon: string
  text: string
  /** The line under the text, when the row has one. */
  note?: string
  to?: RouteLocationRaw
}

/**
 * The purchase assurances under the product page's buy button: how long
 * delivery takes, what shipping the product costs, how the shopper can pay and
 * for how long they can return it.
 *
 * ONE reader for every design: both product pages draw the rows this
 * returns, and a design's own templates fetch nothing. The facts are the
 * store's (`useStoreAssuranceFacts`, which the `store_assurances` band reads
 * too); this picks the product page's three rows from them, and each hides
 * when its fact is missing (no delivery days entered, no active pay way, no
 * return window), so a store never promises what it has not said. The whole
 * box is the store's `productAssurances` preference, and needs the cart: a
 * browse-only store promises no delivery.
 *
 * The delivery row also says what shipping THIS product costs
 * (`GET /api/shipping/product/<id>`, Django's price of a cart holding it
 * alone, as checkout would charge it): "shipping from 1,99 € · free over
 * 39,90 €", or that it ships free. It is the note under the delivery days,
 * or the row's own text for a store that entered none, and never sits under
 * the ways to pay, where it would read as a cash-on-delivery fee. It is
 * left out when Django has no price for it (the store ships nowhere, no
 * carrier takes it, or the request failed).
 *
 * `coversFreeShipping` is whether the row states what shipping costs, so the
 * product page does not state the store-wide threshold a second time in its
 * notice. A shopper whose cart already has a free-shipping route is shown
 * the cart's own distance by that notice instead ("add 12 € more"), so the
 * row then says nothing about shipping: one statement, the more useful one.
 */
export async function useProductAssurances(productId: MaybeRefOrGetter<number | string>) {
  const { $i18n } = useNuxtApp()
  const preferred = useStorePreference('productAssurances')
  const label = computed(() => $i18n.t('product_assurances.label'))

  // A store that turned the box off asks for nothing.
  if (!preferred.value) {
    return { rows: computed<ProductAssuranceRow[]>(() => []), label, coversFreeShipping: computed(() => false) }
  }

  const { cart } = storeToRefs(useCartStore())
  const cartHasProgress = computed(() => Boolean(cart.value?.freeShippingProgress))

  const cartEnabled = useStoreFeature('cart')
  // Both start before either is awaited: a composable keeps its Nuxt context
  // only until its first `await`.
  const [facts, { data: shipping }] = await Promise.all([
    useStoreAssuranceFacts(),
    useApi(() => `/api/shipping/product/${toValue(productId)}`, {
      key: () => `shipping:product:${toValue(productId)}`,
      headers: useRequestHeaders(),
      enabled: cartEnabled,
    }),
  ])

  /** What shipping this product costs, in a line. */
  const shippingLine = computed(() => {
    const estimate = shipping.value?.estimate
    if (!estimate || cartHasProgress.value) return undefined
    if (estimate.free) return $i18n.t('product_assurances.ships_free')
    // Django's money carries its currency: format in it, not the page's.
    const money = (value: number) => $i18n.n(value, { key: 'currency', currency: estimate.currency })
    const price = money(estimate.price)
    return estimate.freeShippingThreshold === null
      ? $i18n.t('product_assurances.shipping_from', { price })
      : $i18n.t('product_assurances.shipping_from_free_over', {
          price,
          amount: money(estimate.freeShippingThreshold),
        })
  })

  const delivery = computed<ProductAssuranceRow | null>(() => {
    const days = facts.value?.deliveryDays
    const shipping = shippingLine.value
    if (!days) {
      return shipping === undefined ? null : { kind: 'delivery', icon: 'i-lucide-truck', text: shipping }
    }

    const { min, max } = days
    return {
      kind: 'delivery',
      icon: 'i-lucide-truck',
      text: min === max
        ? $i18n.t('product_assurances.delivery_days', { count: min }, min)
        : $i18n.t('product_assurances.delivery_range', { min, max }),
      note: shipping,
    }
  })

  const payment = computed<ProductAssuranceRow | null>(() => {
    const phrase = facts.value?.payment
    return phrase ? { kind: 'payment', icon: 'i-lucide-credit-card', text: phrase } : null
  })

  const returns = computed<ProductAssuranceRow | null>(() => {
    const days = facts.value?.returnDays
    if (!days) return null
    return {
      kind: 'returns',
      icon: 'i-lucide-undo-2',
      text: $i18n.t('product_assurances.returns', { count: days }, days),
      to: facts.value?.returnPolicy,
    }
  })

  const rows = computed<ProductAssuranceRow[]>(() =>
    [delivery.value, payment.value, returns.value].filter(row => row !== null),
  )

  return {
    rows,
    label,
    coversFreeShipping: computed(() => shippingLine.value !== undefined),
  }
}
