/**
 * The order this browser's checkout placed that still waits for its online
 * payment (`rememberAwaitingPaymentOrder`), read again from Django: `null`
 * until the page has mounted, and when there is none or Django does not offer
 * it a payment link right now (`offersPaymentLink`).
 *
 * Django keeps the cart while such an order is unpaid, so a shopper who left
 * the provider's page comes back to the same cart; the cart and the checkout
 * show this order (`OrderAwaitingPaymentReminder`) so it is paid instead of
 * placed again. An order that is paid, closed or no longer readable is
 * forgotten; one that takes no link for now (a payment the provider is
 * processing) and a failed read are kept, and the next page asks again. Browser
 * only: the order is kept in `localStorage`.
 */
export function useAwaitingPaymentOrder() {
  const { locale } = useI18n({ useScope: 'global' })
  const order = ref<OrderDetail | null>(null)

  onMounted(async () => {
    const uuid = readAwaitingPaymentOrder()
    if (!uuid) return
    try {
      const found = await $api<RetrieveOrderByUuidResponse>(`/api/orders/uuid/${uuid}`, {
        method: 'GET',
        query: { languageCode: locale.value },
      })
      // No hold: paid or closed, nothing left to pay for.
      if (!found.paymentHoldExpiresAt) {
        forgetAwaitingPaymentOrder(uuid)
        return
      }
      // A link opened elsewhere (the order's page) may have moved it.
      extendAwaitingPaymentOrder(uuid, found.paymentHoldExpiresAt)
      // A payment the provider is processing, or a charge the store
      // reviews, takes no link for now but may still end unpaid: kept,
      // and shown once it takes one again.
      if (offersPaymentLink(found)) {
        order.value = found
      }
    }
    catch (error) {
      const { status } = describeApiError(error)
      // Gone, or no longer this reader's (a guest's link past its days).
      if (status === 404 || status === 403) {
        forgetAwaitingPaymentOrder(uuid)
      }
      log.warn({ action: 'order:awaitingPayment', status, error })
    }
  })

  return order
}
