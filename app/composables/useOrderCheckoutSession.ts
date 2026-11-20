/**
 * A payment link for an order that waits for its online payment: Django
 * opens the provider's hosted page (Stripe Checkout or Viva Smart Checkout)
 * for the same order, as often as asked while it is payable
 * (`POST /api/orders/<id>/create-checkout-session`), and refuses after with
 * `order_not_payable` or `payment_window_expired`.
 *
 * Shared by the checkout's payment step (`VivaWalletCheckout`,
 * `StripeCheckout`) and the order's own pages (`OrderPayNow`), so every way
 * to pay asks the same thing.
 *
 * - The success URL is the order's confirmation, with Stripe's
 *   `{CHECKOUT_SESSION_ID}` placeholder, which Stripe fills in on its
 *   return. Viva returns to the URL its merchant portal holds and never
 *   reads either URL, so one address serves both.
 * - The cancel URL is where Stripe sends a shopper who backs out: the
 *   caller's `cancelPath`, a path of this store.
 * - The email and the provider's description are Django's: it fills both
 *   from the order.
 *
 * `open` resolves with the address to send the browser to, and rejects as
 * `$api` does, so the caller tells the shopper why.
 */
export function useOrderCheckoutSession() {
  const localePath = useLocalePath()

  async function open(order: Pick<OrderDetail, 'id' | 'uuid'>, cancelPath: string): Promise<string> {
    const origin = window.location.origin
    const confirmation = localePath({ name: 'checkout-success-uuid', params: { uuid: order.uuid } })
    const response = await $api(`/api/orders/${order.id}/create-checkout-session`, {
      method: 'POST',
      body: {
        successUrl: `${origin}${confirmation}?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}${cancelPath}`,
      },
      query: { uuid: order.uuid },
    })
    return response.checkoutUrl
  }

  return { open }
}
