import type { MaybeRefOrGetter } from 'vue'

type Priced = Pick<Product, 'finalPrice' | 'effectivePrice' | 'priorPrice' | 'announcedDiscountPercent'>

const currentPrice = (product: Priced | null | undefined) => product ? productCurrentPrice(product) : undefined

/**
 * The price THIS shopper pays for a product on screen, and the one to
 * strike through beside it.
 *
 * Wholesale price hydration is client-only: retail renders first, then
 * swaps — the cached anonymous catalogue HTML and product API responses
 * must never carry a per-customer price (see `useB2BPricing`). Call it
 * from a component's setup; the id is registered on mount. A list of
 * products registers its ids itself and prices each row with
 * `shopperFinalPrice`.
 *
 * `productId` is passed apart from `product` because a search hit carries
 * the product's id in `master`, not `id`. A product that has not loaded
 * yet (`null` / `undefined`) has no price.
 */
export function useShopperPrice(
  productId: MaybeRefOrGetter<number>,
  product: MaybeRefOrGetter<Priced>,
): { displayFinalPrice: ComputedRef<number>, wasPrice: ComputedRef<number | undefined>, announcement: ComputedRef<PriceAnnouncement | undefined> }
export function useShopperPrice(
  productId: MaybeRefOrGetter<number | undefined>,
  product: MaybeRefOrGetter<Priced | null | undefined>,
): { displayFinalPrice: ComputedRef<number | undefined>, wasPrice: ComputedRef<number | undefined>, announcement: ComputedRef<PriceAnnouncement | undefined> }
export function useShopperPrice(
  productId: MaybeRefOrGetter<number | undefined>,
  product: MaybeRefOrGetter<Priced | null | undefined>,
) {
  const { register, priceFor } = useB2BPricing()
  onMounted(() => {
    const id = toValue(productId)
    if (id) register(id)
  })

  const displayFinalPrice = computed(() =>
    shopperFinalPrice(currentPrice(toValue(product)), priceFor(toValue(productId))),
  )

  // The prior price of an announced reduction, or the retail price under a
  // wholesale one (see productWasPrice).
  const wasPrice = computed(() => {
    const current = toValue(product)
    return current ? productWasPrice(current, displayFinalPrice.value ?? productCurrentPrice(current)) : undefined
  })

  // The reduction the shopper may be told about: none under a wholesale
  // price, which is not a consumer announcement.
  const announcement = computed(() => {
    const current = toValue(product)
    const wholesale = current && displayFinalPrice.value !== undefined && displayFinalPrice.value < productCurrentPrice(current)
    return current && !wholesale ? productAnnouncement(current) : undefined
  })

  return { displayFinalPrice, wasPrice, announcement }
}
