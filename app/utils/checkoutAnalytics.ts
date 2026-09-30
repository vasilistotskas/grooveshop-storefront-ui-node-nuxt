/**
 * The cart as each analytics vendor's checkout events describe it. The
 * vendors match on their own field names and silently drop anything
 * else, so each shape lives here once instead of once per event.
 *
 * A line's unit price is its product's `finalPrice` (VAT in, discount
 * off), falling back to the net `price`.
 */
type AnalyticsCart = Pick<CartDetail, 'items'> | null | undefined

const unitPrice = (item: CartItem) =>
  Number(item.product?.finalPrice ?? item.product?.price ?? 0)

const productId = (item: CartItem) => String(item.product?.id ?? '')

/** Meta's `content_ids`: the product ids in the cart, lines without one skipped. */
export function cartContentIds(cart: AnalyticsCart): string[] {
  return cart?.items?.map(productId).filter(id => !!id) ?? []
}

/** TikTok's `contents`. */
export function cartTikTokContents(cart: AnalyticsCart) {
  return cart?.items?.map(item => ({
    contentId: productId(item),
    quantity: Number(item.quantity ?? 0),
    price: unitPrice(item),
  })) ?? []
}

/** GA4's `items`. */
export function cartGa4Items(cart: AnalyticsCart) {
  return cart?.items?.map(item => ({
    item_id: productId(item),
    quantity: Number(item.quantity ?? 0),
    price: unitPrice(item),
  })) ?? []
}

/** OpenAI's `contents`: no price — the event's `amount` carries the value. */
export function cartOpenAIContents(cart: AnalyticsCart) {
  return (cart?.items ?? []).map(item => ({
    id: productId(item),
    contentType: 'product' as const,
    quantity: Number(item.quantity ?? 0),
  }))
}
