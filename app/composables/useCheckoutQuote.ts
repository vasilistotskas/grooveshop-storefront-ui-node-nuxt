/**
 * What checkout charges, from Django's quote (`POST /api/cart/quote`,
 * `server/api/cart/quote.post.ts`): the one computation order creation
 * runs too, so the summary, the «Pay …» button and the order's
 * `expectedTotal` are the same figures. Nothing here adds up a total.
 *
 * Asked again whenever what it prices changes: the request, compared as a
 * value so a keystroke in a field it does not carry asks nothing, and the
 * cart (`cartVersion`: its lines, coupons and prices). Server-rendered
 * with the page; never asked without a cart line, which Django would
 * refuse (`cart_empty`).
 */
export function useCheckoutQuote({ request, cartVersion }: {
  /** The quote body: `quoteRequestOf` the order the form would place. */
  request: MaybeRefOrGetter<CartQuoteRequestRequest>
  /** Changes whenever the cart changes what it costs. */
  cartVersion: MaybeRefOrGetter<string>
}) {
  const { cart } = storeToRefs(useCartStore())

  const requestKey = computed(() => JSON.stringify(toValue(request)))

  const { data, status, error, refresh } = useLazyApi<QuoteCartResponse>('/api/cart/quote', {
    key: 'checkout-quote',
    method: 'POST',
    body: computed(() => toValue(request)),
    // Asked by the watcher below: the body is rebuilt on every form edit,
    // and only a change in what it prices may ask again.
    watch: false,
    enabled: () => Boolean(cart.value?.items?.length),
  })

  watch([requestKey, () => toValue(cartVersion)], () => {
    void refresh()
  })

  /** The quote on the page, `null` before the first answer and while Django refuses one. */
  const quote = computed<CheckoutQuote | null>(() =>
    status.value === 'error' ? null : data.value ?? null)

  /**
   * The quote for the request as it stands, what an order is placed at:
   * a request in flight is waited for. Without one, Django's refusal
   * (`error`, `null` when nothing could be asked).
   */
  async function current(): Promise<{ quote: CheckoutQuote | null, error: unknown }> {
    // A change made just now has queued its watcher; let it ask first.
    await nextTick()
    if (status.value === 'pending') await refresh({ dedupe: 'defer' })
    return status.value === 'success' && data.value
      ? { quote: data.value, error: null }
      : { quote: null, error: error.value ?? null }
  }

  return {
    quote,
    current,
    refresh: () => refresh(),
  }
}
