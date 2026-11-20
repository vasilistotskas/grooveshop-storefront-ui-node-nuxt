/**
 * The order this browser's checkout placed that still waits for its online
 * payment (`rememberAwaitingPaymentOrder`), read again from Django: `null`
 * until the page has mounted, and when there is none or Django no longer
 * offers it a payment link (`offersPaymentLink`).
 *
 * Django keeps the cart while such an order is unpaid, so a shopper who left
 * the provider's page comes back to the same cart; the cart and the checkout
 * show this order (`OrderAwaitingPaymentReminder`) so it is paid instead of
 * placed again. An order that is paid, closed or no longer readable is
 * forgotten; a failed read is not, and the next page asks again. Browser
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
      if (offersPaymentLink(found)) {
        order.value = found
      }
      else {
        forgetAwaitingPaymentOrder(uuid)
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
