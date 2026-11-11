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
 * delivery takes, what free shipping starts at, how the shopper can pay and
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
 * `coversFreeShipping` is whether a row states the free-shipping threshold,
 * so the product page does not state it a second time in its notice. A
 * shopper whose cart already has a free-shipping route is shown the cart's
 * own distance by that notice instead ("add 12 € more"), so the row then
 * leaves the store-wide threshold out: one statement, the more useful one.
 */
export async function useProductAssurances() {
  const { $i18n } = useNuxtApp()
  const preferred = useStorePreference('productAssurances')
  const label = computed(() => $i18n.t('product_assurances.label'))

  // A store that turned the box off asks for nothing.
  if (!preferred.value) {
    return { rows: computed<ProductAssuranceRow[]>(() => []), label, coversFreeShipping: computed(() => false) }
  }

  const { cart } = storeToRefs(useCartStore())
  const cartHasProgress = computed(() => Boolean(cart.value?.freeShippingProgress))

  const facts = await useStoreAssuranceFacts()

  const delivery = computed<ProductAssuranceRow | null>(() => {
    const days = facts.value?.deliveryDays
    if (!days) return null

    const { min, max } = days
    const threshold = facts.value?.freeShippingFrom ?? null
    return {
      kind: 'delivery',
      icon: 'i-lucide-truck',
      text: min === max
        ? $i18n.t('product_assurances.delivery_days', { count: min }, min)
        : $i18n.t('product_assurances.delivery_range', { min, max }),
      note: threshold !== null && !cartHasProgress.value
        ? $i18n.t('product_assurances.free_shipping_over', { amount: $i18n.n(threshold, 'currency') })
        : undefined,
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
    coversFreeShipping: computed(() => rows.value.some(row => row.kind === 'delivery' && row.note !== undefined)),
  }
}
