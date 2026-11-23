/**
 * What checkout charges, from Django's quote (`POST /api/cart/quote`,
 * `server/api/cart/quote.post.ts`): the one computation order creation
 * runs too, so the summary, the «Pay …» button and the order's
 * `expectedTotal` are the same figures, and its `cartDigest` is the cart
 * the order is made of. Nothing here adds up a total.
 *
 * Asked again whenever what it prices changes: the request, compared as a
 * value so a keystroke in a field it does not carry asks nothing, and the
 * cart (`cartVersion`: its lines, coupons and prices). Server-rendered
 * with the page; never asked, nor shown, without a cart line, which
 * Django would refuse (`cart_empty`).
 */
export function useCheckoutQuote({ request, cartVersion }: {
  /** The quote body: `quoteRequestOf` the order the form would place. */
  request: MaybeRefOrGetter<CartQuoteRequestRequest>
  /** Changes whenever the cart changes what it costs. */
  cartVersion: MaybeRefOrGetter<string>
}) {
  const { cart } = storeToRefs(useCartStore())
  const hasLines = computed(() => Boolean(cart.value?.items?.length))

  const requestKey = computed(() => JSON.stringify(toValue(request)))

  const { data, status, error, refresh } = useLazyApi('/api/cart/quote', {
    key: 'checkout-quote',
    method: 'POST',
    body: computed(() => toValue(request)),
    // Asked by the watcher below: the body is rebuilt on every form edit,
    // and only a change in what it prices may ask again.
    watch: false,
    enabled: hasLines,
    // The quote with the choices it priced, so what the summary names a
    // fee or a redemption after is the quote's own, never a selection made
    // since that the next quote has not priced yet. A change of the
    // request asks again and cancels the request in flight, so only an
    // answer to the request as it stands is ever transformed. A copy, as a
    // ref's object edited in place must not rewrite what was priced: the
    // request is plain JSON (it is the body sent), the same text the
    // watcher compares.
    transform: (quote: CartQuote): PricedQuote => ({
      quote,
      request: JSON.parse(requestKey.value) as CartQuoteRequestRequest,
    }),
  })

  watch([requestKey, () => toValue(cartVersion)], () => {
    void refresh()
  })

  /**
   * The quote on the page, `null` before the first answer, while Django
   * refuses one and without a cart line: the rows, and the priced lists
   * the delivery and pay-way cards read (`shippingOptions`, `payWays`).
   */
  const quote = computed<CartQuote | null>(() =>
    hasLines.value && status.value !== 'error' ? data.value?.quote ?? null : null)

  /** The choices the quote on the page priced (its pay way, its points). */
  const quotedFor = computed<CartQuoteRequestRequest | null>(() =>
    quote.value ? data.value?.request ?? null : null)

  /** A quote is being asked for: what is on the page may be about to change. */
  const pending = computed(() => status.value === 'pending')

  /**
   * Why Django refused the quote, in the page's language (its coded
   * refusal: a pay way not offered, a delivery it cannot price, a gift
   * card or a points redemption it does not accept), `null` while it
   * answers. Without it a refused quote left dashes and nothing saying why.
   */
  const refusal = computed<string | null>(() =>
    status.value === 'error' ? describeApiError(error.value).description : null)

  /** The stable `code` of Django's refusal of the quote, `null` while it answers. */
  const refusalCode = computed<string | null>(() =>
    status.value === 'error' ? describeApiError(error.value).code ?? null : null)

  /**
   * The quote for the request as it stands, what an order is placed at:
   * a request in flight is waited for, and one that failed is asked again
   * (the same choices: a recovered service answers). Without one, Django's
   * refusal (`error`, `null` when nothing could be asked).
   */
  async function current(): Promise<{ quote: CartQuote | null, error: unknown }> {
    // A change made just now has queued its watcher; let it ask first.
    await nextTick()
    if (status.value === 'pending') await refresh({ dedupe: 'defer' })
    else if (status.value === 'error') await refresh()
    return hasLines.value && status.value === 'success' && data.value
      ? { quote: data.value.quote, error: null }
      : { quote: null, error: error.value ?? null }
  }

  return {
    quote,
    quotedFor,
    pending,
    refusal,
    refusalCode,
    current,
    /** Asks again with the same choices: after a refusal, or a total Django changed. */
    refresh: () => refresh(),
  }
}

/** A quote and the choices it priced. */
interface PricedQuote {
  quote: CartQuote
  request: CartQuoteRequestRequest
}
