/**
 * Derives the shipping cost for a given shipping method and cart total.
 *
 * home_delivery: reads CHECKOUT_SHIPPING_PRICE + FREE_SHIPPING_THRESHOLD from
 * the settings API (already cached by useCheckoutForm when called from the
 * checkout page).
 *
 * box_now_locker: uses BoxNow's contractual flat rate (€2.50 / free over €30).
 * BoxNow's price is fixed by partnership terms so we hard-code it here.
 * If the rate ever becomes admin-tunable, expose BOXNOW_SHIPPING_PRICE and
 * BOXNOW_FREE_SHIPPING_THRESHOLD via extra_settings on Django and replace
 * the constants below with a `useAsyncData` block mirroring the home_delivery
 * pattern further down.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShippingPriceResult {
  /** Effective shipping cost after applying the free-shipping threshold. */
  price: number
  /** Whether shipping is free for the current cart total. */
  isFree: boolean
  /** The cart total above which shipping becomes free. */
  threshold: number
  /** The base shipping cost before the free-shipping check. */
  baseCost: number
}

// ---------------------------------------------------------------------------
// BoxNow defaults (hard-coded until wave 2 exposes them via the settings API)
// ---------------------------------------------------------------------------

const BOXNOW_DEFAULT_SHIPPING_PRICE = 2.50
const BOXNOW_DEFAULT_FREE_SHIPPING_THRESHOLD = 30.00

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Reactive computed shipping price for the given shipping method and cart
 * total.
 *
 * Both `method` and `cartTotal` accept a raw value, a `ref`, or a getter
 * function — they are normalised via `toValue()` inside the computed.
 *
 * @example
 * ```ts
 * const { price, isFree } = useShippingPrice(
 *   () => formState.shippingMethod,
 *   () => cart.value?.totalPrice ?? 0,
 * )
 * ```
 */
export async function useShippingPrice(
  method: MaybeRefOrGetter<ShippingMethodEnum>,
  cartTotal: MaybeRefOrGetter<number>,
): Promise<ComputedRef<ShippingPriceResult>> {
  // Fetch home-delivery settings from the same cache keys that
  // useCheckoutForm uses — if already called on the same page the results
  // are deduped and no additional network request is made.
  const [shippingResult, thresholdResult] = await Promise.all([
    useAsyncData<{ value: string } | null>(
      'checkout:shipping-price-setting',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'CHECKOUT_SHIPPING_PRICE' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
    useAsyncData<{ value: string } | null>(
      'checkout:free-shipping-threshold-setting',
      () => $fetch<{ value: string }>('/api/settings/get', {
        method: 'GET',
        query: { key: 'FREE_SHIPPING_THRESHOLD' },
        headers: useRequestHeaders(),
      }).catch(() => null),
    ),
  ])

  return computed<ShippingPriceResult>(() => {
    const resolvedMethod = toValue(method)
    const resolvedTotal = toValue(cartTotal)

    if (resolvedMethod === 'box_now_locker') {
      // BoxNow's flat-rate contract — see file-header docstring for the
      // path to make this admin-editable if requirements change.
      const baseCost = BOXNOW_DEFAULT_SHIPPING_PRICE
      const threshold = BOXNOW_DEFAULT_FREE_SHIPPING_THRESHOLD
      const isFree = resolvedTotal >= threshold
      return {
        price: isFree ? 0 : baseCost,
        isFree,
        threshold,
        baseCost,
      }
    }

    // HOME_DELIVERY — pull from settings API.
    const baseCost = shippingResult.data.value?.value
      ? parseFloat(shippingResult.data.value.value)
      : 0

    const threshold = thresholdResult.data.value?.value
      ? parseFloat(thresholdResult.data.value.value)
      : 50.00

    const isFree = resolvedTotal >= threshold
    return {
      price: isFree ? 0 : baseCost,
      isFree,
      threshold,
      baseCost,
    }
  })
}
